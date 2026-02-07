# MedaBot UX/UI Overhaul Plan

## Context

MedaBot helps users identify medicines from photos, retrieve official INFARMED patient leaflets, and ask questions via RAG-powered chat. The current UI was hastily built by an LLM — it works but feels generic, lacks polish, and has several UX gaps. Mobile is the primary target. The chat and PDF viewer are the most-used screens and need the most attention.

**Critical bugs found during exploration:**
- `app/server/queryLeaflet.ts:16` re-processes the entire PDF (extract + chunk + embed) on **every single question**. This is extremely wasteful and slow.
- `app/context/PDFContext.tsx` has no concept of active tab — `jumpToPage()` from chat can't switch the mobile tab to PDF.
- INFARMED search returns no disambiguation data to the client — silent failures with no recovery path.

---

## Phase 1: Foundation + Critical Fixes (P0) ✅

### 1.1 Design System Tokens (`app/index.css`)
Added Tailwind CSS 4 `@theme` block with:
- Color palette: blue primary (trust), teal accent (modern health), proper grays, semantic error/success/warning
- Typography: 16px body minimum, 1.5x+ line height
- Border radii: consistent `--radius-lg`, `--radius-xl`, `--radius-2xl`
- New keyframe animations: `typing-dots`, `pulse-highlight` (PDF page jump), `slide-up`, `fade-scale-in`

### 1.2 Shared UI Primitives (`app/components/ui/`)
Thin Tailwind wrappers — not a component library, just consistent styling:
- **`Button.tsx`** — variants: `primary`, `secondary`, `ghost`, `danger`. All 44px+ touch targets.
- **`Chip.tsx`** — for suggested questions + page references. Tappable, rounded-full, 44px min height.
- **`Card.tsx`** — `bg-white rounded-2xl shadow-sm border border-gray-100`

### 1.3 Fix Query Performance (`app/server/queryLeaflet.ts`)
Added module-level chunk cache (`Map<string, ChunkWithEmbedding[]>`) keyed by PDF SHA-256 hash. Process once on first query, retrieve from cache on subsequent queries.

### 1.4 Lift Tab State to Context (`app/context/PDFContext.tsx`)
- Added `activeTab: 'chat' | 'medicine' | 'pdf'` and `setActiveTab()` to PDFContext
- Updated `jumpToPage()` to also call `setActiveTab('pdf')` — this makes chat page references switch to the PDF tab on mobile
- Added `cameFromChat: boolean` flag for "Back to Chat" button

### 1.5 Connect TabLayout to Context (`app/components/layouts/TabLayout.tsx`)
- Removed local `useState` for `activeTab`
- Consumes `activeTab` and `setActiveTab` from PDFContext instead
- Moved tabs to bottom of screen (thumb-friendly on mobile)
- Replaced emoji icons with proper SVG icons

---

## Phase 2: Chat Overhaul (P0) ✅

**File:** `app/components/Chat.tsx` — the most-used screen, needs the most work.

### 2.1 Message Formatting
- Replaced `whitespace-pre-wrap` plain text with a lightweight markdown renderer
- New `app/utils/formatMessage.tsx`: parses **bold**, bullet lists, numbered lists — no external dependency
- Chained with existing `parseMessageWithReferences`

### 2.2 Source Attribution
- Extended `ChatMessage` interface with `sourcePages?: number[]`
- Stored `result.pageNumbers` from `queryLeafletPdf` response in each assistant message
- Renders subtle source line below each AI bubble: "Fonte: Folheto informativo, p. 3-4"

### 2.3 Page Reference Chips
- Updated `app/utils/parseReferences.tsx` to render `<Chip>` components instead of raw `<button>` elements
- Compact format: `p.3` instead of full "pagina 3" text
- On click: calls `jumpToPage()` which now switches tab on mobile (from Phase 1.4)

### 2.4 Persistent Suggested Questions
- Removed `messages.length <= 1` condition — always show suggestions
- Positioned between last message and input area

### 2.5 Input & Loading Polish
- Replaced deprecated `onKeyPress` with `onKeyDown`
- Send icon button instead of text "Enviar"
- Replaced spinner + "A pensar..." with animated typing dots (3 bouncing dots)
- Added persistent subtle disclaimer banner at top: "Respostas baseadas no folheto informativo oficial."

### 2.6 Visual Redesign
- Used the new `Button`, `Chip`, `Card` primitives
- Better bubble design: rounded-2xl, proper padding, subtle shadows
- Consistent spacing: 1px between same-sender messages, 16px between sender changes
- Scroll-to-bottom button repositioned with proper styling

---

## Phase 3: PDF Viewer Enhancement (P1) ✅

**File:** `app/components/PDFViewer.tsx`

### 3.1 Touch Gestures
- New `app/hooks/usePinchZoom.ts` — pinch-to-zoom on mobile (0.5x–3.0x continuous)
- New `app/hooks/useSwipeNavigation.ts` — swipe left/right for page navigation

### 3.2 Page Jump Highlight
- When `jumpToPage()` is called from chat, triggers a brief golden border pulse on the PDF container (1.5s CSS animation)
- Tracks `lastJumpedPage` in PDFContext

### 3.3 "Back to Chat" Button
- New `app/components/ui/FloatingBackButton.tsx`
- Shows on PDF tab when user arrived from a chat reference click (`cameFromChat` from Phase 1.4)
- Fixed pill button above bottom tab bar: "Voltar ao Chat"
- Auto-dismisses after tap or 10s

### 3.4 Improved Controls
- Continuous zoom slider instead of discrete cycling
- Page number input (tap page counter to type a specific page)
- Proper 44px touch targets on all controls

---

## Phase 4: Processing Pipeline & Error Recovery (P1) ✅

### 4.1 Extract Processing Screen (`app/components/ProcessingScreen.tsx`)
Extracted the inline processing JSX from `App.tsx` into its own component.

### 4.2 Progressive Disclosure in Processing
- After identification completes, immediately shows medicine info card (name, substance, dosage)
- Dynamic contextual messages per step: "A procurar 'Paracetamol Ratiopharm' na base de dados do INFARMED..."

### 4.3 Step-Level Retry (`app/components/App.tsx`)
- Tracks `failedStep` state — which step failed
- On error, shows retry button for that specific step (not pipeline reset)
- Preserves completed step results (if identify succeeded but fetch failed, keeps `medicineInfo`)
- Refactored single try/catch into per-step error handling

### 4.4 INFARMED Disambiguation (`app/core/regulatoryPdf.ts`)
- When `bestMatch.similarity < 0.7`, returns top 3 candidates with scores to the client
- New return shape: `{ rcm, fi, candidates?, confidence }`
- Updated `app/server/fetchRegulatoryPdf.ts` to pass candidates through
- New `app/components/DisambiguationCard.tsx` — shows top matches as selectable cards
- "Nenhum destes" option falls back to manual search

---

## Phase 5: Landing, Camera & Smart Search (P1) ✅

### 5.1 Landing Page Redesign (`app/components/LandingPage.tsx`)
- Simplified: removed "Como funciona" and "Caracteristicas" sections
- Single strong value prop + 2 CTAs at thumb-reach position
- Primary: Camera scan (large, prominent)
- Secondary: Smart text search field
- Clean, spacious design with the new color palette

### 5.2 Camera Improvements (`app/components/Camera.tsx`)
- Full-screen viewfinder on mobile (removed card wrapper)
- SVG overlay guide: rounded rectangle for medicine framing
- Capture: white flash + brief preview before transition
- Large circular capture button at bottom (camera app pattern)
- Single-line tip overlaid on viewfinder instead of separate tip box

### 5.3 Smart Search (`app/components/SearchScreen.tsx`)
- Single text input: "Ex: Paracetamol 500mg, Ben-u-ron..."
- New `app/server/parseSearchInput.ts` — GPT parses free text into `{name, activeSubstance, dosage, brand}`
- Shows interpreted result: user can edit before searching
- "Pesquisa avançada" link expands to the old 4-field form (kept `ManualMedicineForm.tsx` as fallback)

---

## Phase 6: Polish & Nice-to-Haves (P2) ✅

- **AI-generated follow-up suggestions** — `app/server/suggestFollowUps.ts` (GPT-4o-mini generates 2-3 contextual questions after each answer)
- **Rename typo file** — `fetchRefulatoryPdf.ts` → `fetchRegulatoryPdf.ts`
- **Clean dead code** — Removed unused `readCount`/`updateCount`/`getCount` from `app/routes/index.tsx`

---

## Files Changed Summary

| Phase | File | Action |
|-------|------|--------|
| 1 | `app/index.css` | Modified: @theme tokens, animations |
| 1 | `app/components/ui/Button.tsx` | Created |
| 1 | `app/components/ui/Chip.tsx` | Created |
| 1 | `app/components/ui/Card.tsx` | Created |
| 1 | `app/server/queryLeaflet.ts` | Modified: chunk caching |
| 1 | `app/context/PDFContext.tsx` | Modified: added activeTab, cameFromChat |
| 1 | `app/components/layouts/TabLayout.tsx` | Modified: consume context, bottom tabs, SVG icons |
| 2 | `app/components/Chat.tsx` | Major rewrite |
| 2 | `app/utils/formatMessage.tsx` | Created |
| 2 | `app/utils/parseReferences.tsx` | Modified: use Chip |
| 3 | `app/components/PDFViewer.tsx` | Major modify |
| 3 | `app/hooks/usePinchZoom.ts` | Created |
| 3 | `app/hooks/useSwipeNavigation.ts` | Created |
| 3 | `app/components/ui/FloatingBackButton.tsx` | Created |
| 4 | `app/components/App.tsx` | Major modify: step retry, progressive display |
| 4 | `app/components/ProcessingScreen.tsx` | Created (extracted from App.tsx) |
| 4 | `app/components/DisambiguationCard.tsx` | Created |
| 4 | `app/core/regulatoryPdf.ts` | Modified: return candidates |
| 4 | `app/server/fetchRegulatoryPdf.ts` | Created (renamed from typo) |
| 4 | `app/server/fetchRefulatoryPdf.ts` | Deleted (typo filename) |
| 5 | `app/components/LandingPage.tsx` | Major rewrite |
| 5 | `app/components/Camera.tsx` | Major modify |
| 5 | `app/components/SearchScreen.tsx` | Created |
| 5 | `app/server/parseSearchInput.ts` | Created |
| 5 | `app/components/layouts/MobileLayout.tsx` | Modified: cleaner header |
| 6 | `app/server/suggestFollowUps.ts` | Created |
| 6 | `app/routes/index.tsx` | Modified: removed dead code |
