# Medabot "Apothecary Counter" Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the entire Medabot frontend to the high-fidelity "Apothecary counter" direction (ink-navy + amber, Newsreader + Geist, flat/document aesthetic) defined in `design_handoff_apothecary/README.md`, changing only visuals + copy — no backend/logic changes.

**Architecture:** Tailwind CSS 4 `@theme` token swap first (everything depends on it), then the shared UI primitives, then each screen component rewritten in place against its **existing prop interface** (drop-in compatible), then layout restyling and the small behavioural wires (suggested-questions, rotating placeholder, amber citation wash). All work lands on a **single branch / single PR** (`lt/apothecary-redesign`).

**Tech Stack:** React 19 functional components, TanStack Start RC + TanStack Router (file-based routes), Tailwind CSS 4 (`@theme` in `app/index.css`), TypeScript strict. Fonts via Google Fonts. Icons are inline SVGs ported from `design_handoff_apothecary/prototype/shared.jsx`.

**Authoritative references (checked into the repo):**
- Spec: `design_handoff_apothecary/README.md` — §6 tokens, §7 primitives, §8 screens, §9 copy table, §10 behaviours. **All Portuguese copy strings live here; use them verbatim.**
- Prototype source: `design_handoff_apothecary/prototype/*.jsx` — visual reference per screen (`screen-*.jsx`), primitives (`shared.jsx`), marks (`marks.jsx`).
- Visual ground truth: open `design_handoff_apothecary/prototype/Medabot Revamp.html` in a browser (Playwright) to compare pixels.

**Token-naming note:** README §6.1 gives Tailwind-namespaced custom properties (`--color-brand`, `--color-accent-soft`, …) so Tailwind v4 auto-generates `bg-brand`, `text-accent-ink`, `border-border`, etc. The prototype `.jsx`/`tokens.css` use un-prefixed vars (`--brand`, `--r-2`) and one stale comment calls the amber citation "terracotta" — **ignore those; README §6.1 tokens win** (the citation is amber).

**Decisions locked with the user (from README §14):**
- **§14 Q1 — suggested questions:** WIRE UP the existing `app/server/suggestFollowUps.ts` (returns `string[]`); replace the hardcoded `sampleQuestions` array in `Chat.tsx`. **Caveat (review finding):** the server fn uses `response_format: { type: "json_object" }` but its prompt asks for a bare array, so `parsed.questions || parsed.followUps` is likely always `undefined` → it returns `[]` and the feature would perma-fall-back to static. Task 5.6 must (a) verify this against the real file, and (b) if broken, apply the **minimal** prompt/parse fix to make it return real questions. This single server-file fix is the **one sanctioned exception to §13** because README §8.6/§10 explicitly instructs "wire this up if it isn't already" — wiring to a function that always returns empty is not wiring it up. No API surface / input-output contract change. Robust static fallback stays regardless.
- **§14 Q2 — "Importante saber" callout — REVISED after review:** do **NOT** fire a new `queryLeafletPdf` call (it adds always-on inference cost and double-fires on desktop where MedicineInfoPanel + Chat mount together against an uncached PDF). Instead source the callout from the **already-generated `overview` prose** — pass it into `MedicineInfoPanel` as a new **optional** `overview?: string` prop from `App.tsx` (additive, presentational; no state-shape or backend change per §11). Extract dose/alcohol-related sentence(s) client-side; **omit the callout entirely when nothing relevant is found** (reuse Chat's `isNotFoundAnswer`-style matching for the 3 "não encontro/encontrei/consta" variants, not a single literal). No backend, no new query.
- **§14 Q3 — PDF region highlight:** text layer is disabled; true region highlight is out of scope. Keep page-jump and **restyle the existing full-page pulse highlight to an amber wash** (`PDFViewer.tsx` `animate-pulse-highlight`).
- **§14 Q4 — mascot:** keep `assets/medabot-clean.png` out of app chrome; wire it only into a 404/error illustration if one is touched. Not a priority; do not add new routes for it.
- **Placeholder rotation (README §10):** ship the rotating composer placeholder, wrapped in `prefers-reduced-motion` (static fallback) and paused on focus/non-empty input.
- **Disclaimer policy — DELIBERATE reconciliation of a spec conflict:** README §8.1 shows a Landing disclaimer, while §8.6/§8.7 say "remove duplicate disclaimers on Chat and Landing; pick one (recommend Medicine panel only)." Removing it from Landing leaves landing-only users (who never reach the Medicine panel) with no disclaimer — bad for a medical tool. **Decision: keep ONE disclaimer on Landing (entry) + ONE on the Medicine panel (results); remove the Chat-footer instance.** This dedupes within the results view while keeping a disclaimer visible at entry. **Flag this to the user in the PR description** so they can collapse to medicine-only if they prefer the strict §8.7 reading.

**Additive optional props — sanctioned deviations from "no changes" (review findings 1, 2, 5):** the spec's UI requires actions some components cannot self-serve. These are **presentational, optional, additive** props wired from `App.tsx`/`ResponsiveContainer` — they do not change state shape (§11) or any backend/server contract (§13), and existing callers keep working when they're omitted:
- `Chat`:
  - **"Refazer" is implemented Chat-LOCAL — NOT a prop and NOT an App handler.** Cycle-2 finding: there is **no** overview-only regeneration path in `App.tsx` (only `handleForceRefresh` = heavyweight INFARMED re-fetch, and `handleReset` = back to landing), and `Chat` seeds `messages` once behind a `messages.length === 0` guard — regenerating overview in App would NOT update the chat (desync). So "Refazer" = a Chat-internal handler that **resets the local `messages` array back to just the seed overview message** (clears the Q&A, keeps the overview). No new App path, no backend, no remount needed.
  - add optional `onBack?: () => void` — `App.tsx` wires it to its existing `handleReset` (landing). **Desktop row-1 omission is decided INSIDE Chat via `useMediaQuery` (the existing hook), not by withholding `onBack`** — App mounts a single shared `<Chat>` for both breakpoints, so Chat itself hides row-1 (back + wordmark + Refazer) at ≥64rem where the desktop top bar provides that chrome, and shows it below 64rem.
  - add optional `dosage?: string` — needed for the header row-2 mono dosage (§8.6); `App.tsx` passes `dosage={medicineInfo.dosage}`. Render the dosage only when provided.
- `MedicineInfoPanel`: add optional `overview?: string` (see §14 Q2 above).
- `DesktopLayout`: accept `onReset?` (already on `ResponsiveContainer`; just thread it through) so the desktop top-bar "Nova pesquisa" link works.
- `SearchScreen`: add optional `onOpenCamera?: () => void`, wired in `App.tsx` to the existing `setScreen({name:"camera"})` transition, so the §8.2 "Tem a caixa em mãos? Fotografar" hint actually opens the camera (instead of falling back to landing).
If any of these turns out to need real new logic beyond wiring existing App transitions, STOP and surface it rather than inventing backend.

**Testing approach:** The project has **no unit-test framework** (CLAUDE.md: "No test framework is configured"; only `scripts/e2e-test.ts`). This is a visual + copy redesign, so each task is verified by: (1) `npx tsc --noEmit` clean, (2) `npm run build` succeeds, and (3) a Playwright visual check of the running `npm run dev` app against the matching prototype artboard. Do **not** introduce vitest/jest. **This verification is deliberately qualitative** — visual side-by-side comparison against the prototype, no pixel-diff threshold (none is feasible without a baseline harness). **Single-PR caveat:** Task 1 (token swap) commits independently and leaves later-untouched screens visually half-styled until their task lands; this intermediate state is expected on the branch — **do not deploy mid-stack**, only the merged branch is shippable.

**Drop-in contract (do NOT change these):** every screen keeps its current props — **plus** only the small set of additive *optional* props enumerated in the "Additive optional props" decision below (`Chat.onBack?`, `Chat.dosage?`, `MedicineInfoPanel.overview?`, `DesktopLayout.onReset?`, `SearchScreen.onOpenCamera?`). No existing prop is renamed/removed; no server/PDFContext change. Base props verified against current code:
- `LandingPage`: `{ onScanMedicine, onManualEntry }`
- `SearchScreen`: `{ onSubmit, onCancel, onAdvancedSearch }`
- `Camera`: `{ onCapture, onCancel?, onManualEntry? }` — **keep all react-webcam capture logic (§13)**
- `ProcessingScreen`: `{ steps, currentStep, completedSteps, medicineInfo, processingError, failedStep, loading, searchMessage, onRetryStep, onGoToCamera, onGoToManualForm, onReset }`
- `DisambiguationCard`: `{ candidates, onSelect, onNoneMatch }` — `Candidate` has `{ name, activeSubstance, similarity, pharmaceuticalForm?, dosage?, titular? }` (still receives `similarity`; just **stop rendering it**)
- `Chat`: `{ pdfData, medicineName, initialOverview? }`; message shape `{ id, type:"user"|"assistant"|"error", content, timestamp, sourcePages?: number[], isOverview?, retryQuestion? }`
- `MedicineInfoPanel`: `{ medicineInfo, image, pdfData, summary?, onReset, onDownloadPdf, onForceRefresh }`; `MedicineSummary = { category, indications: string[] }`
- `PDFViewer`: `{ onClose?, width?, isTabMode? }`
- Layouts `ResponsiveContainer/DesktopLayout/MobileLayout/TabLayout`: slot `medicineInfoPanel`, `chat` as `ReactNode`; `PDFContext` API (`jumpToPage`, `setActiveTab`, `activeTab: "chat"|"medicine"|"pdf"`, `lastJumpedPage`, …) is unchanged.
- `IdentifyMedicineResponse = { name, brand, activeSubstance, dosage, pharmaceuticalForm?, titular? }`

---

## File Structure

**Rewrite/replace:**
- `app/index.css` — new `@theme` block + remove glass/mesh/noise utilities (Task 1)
- `app/routes/__root.tsx` — swap font `<link>`s (Task 1)
- `app/components/ui/Button.tsx`, `Chip.tsx` — rewrite/restyle (Task 2)
- `app/components/ui/Icon.tsx` (**new**), `Wordmark.tsx` (**new**), `SourceBadge.tsx` (**new**), `Citation.tsx` (**new**), `MetaRow.tsx` (**new**), `Mark.tsx` (**new**) — ported from `prototype/shared.jsx`/`marks.jsx` (Task 2)
- `app/components/ui/Card.tsx` — **flag for deletion** (Task 7; ask user first per instruction)
- `app/components/LandingPage.tsx` (Task 3)
- `app/components/SearchScreen.tsx`, `Camera.tsx`, `ProcessingScreen.tsx`, `DisambiguationCard.tsx` (Task 4)
- `app/components/Chat.tsx` + new `app/hooks/useRotatingPlaceholder.ts` (Task 5)
- `app/components/MedicineInfoPanel.tsx` (Task 6)
- `app/components/PDFViewer.tsx`, `layouts/DesktopLayout.tsx`, `layouts/MobileLayout.tsx`, `layouts/TabLayout.tsx`, `layouts/ResponsiveContainer.tsx` (Task 7)
- `app/components/App.tsx` — **wiring only** (Task 8 / Step 8.0): pass the new additive optional props (`overview` → MedicineInfoPanel; `onOpenCamera` → SearchScreen; `onBack` + `dosage` → Chat; `onReset` → ResponsiveContainer→DesktopLayout). No pipeline/state-shape changes. (Fonts handled in `__root.tsx`, Task 1.)
- `app/utils/isNotFoundAnswer.ts` — **extract** the existing 3-variant "não encontro/encontrei/consta" check from `Chat.tsx` into a shared util so Chat (Task 5.8) and the "Importante saber" callout (Task 6.5) use one implementation (avoid drift).
- `app/components/ui/Icon.tsx` etc. (Task 2, listed above)

**Unchanged (per README §13):** all of `app/server/*` (the **only** exception is the single sanctioned `suggestFollowUps.ts` prompt fix, Task 5.6), `app/core/*`, `app/context/PDFContext.tsx` API, routing, `react-pdf`/`pdf-parse`, type definitions, react-webcam capture logic. `App.tsx` changes are limited to passing additive optional props — no new state, no pipeline change.

---

## Task 1: Design tokens, fonts, global CSS

**Files:**
- Modify: `app/index.css` (full `@theme` rewrite + utilities cleanup)
- Modify: `app/routes/__root.tsx:52-54` (font links)

- [ ] **Step 1.1: Replace the `@theme` block in `app/index.css`.** Keep the `@import "tailwindcss"` and `@source` lines at the top. Replace the entire existing `@theme { … }` with:

```css
@theme {
  /* Fonts */
  --font-serif: "Newsreader", "Source Serif 4", Georgia, serif;
  --font-sans:  "Geist", -apple-system, system-ui, sans-serif;
  --font-mono:  "Geist Mono", "JetBrains Mono", ui-monospace, monospace;

  /* Surfaces — warm neutrals */
  --color-bg:      #F4EFE6;
  --color-surface: #FAF6EE;
  --color-paper:   #FFFFFF;
  --color-tint:    #EDE5D3;

  /* Ink — warm grayscale */
  --color-ink:     #1A1815;
  --color-ink-2:   #4A453E;
  --color-muted:   #847A6E;
  --color-faint:   #B5AC9F;
  --color-border:  #E5DCC9;
  --color-rule:    #EFE8D8;

  /* Brand — deep ink-navy */
  --color-brand:      #1F2D40;
  --color-brand-deep: #0F1A2A;
  --color-brand-soft: #E8EBF1;
  --color-brand-ink:  #0F1A2A;

  /* Accent — warm amber */
  --color-accent:      #B07A1F;
  --color-accent-soft: #F2E8D2;
  --color-accent-ink:  #5C3D0F;

  /* States */
  --color-mustard:      #B47718;
  --color-mustard-soft: #F4E5C8;
  --color-error:        #A6332A;
  --color-error-soft:   #F4DCD8;

  /* Radii — design's 4/8/12 scale (README §6.3). Only override the three
     standard Tailwind v4 `--radius-*` namespace keys we actually use; do NOT
     set bare `--radius` or `--radius-md` (non-standard / surprising). The
     current index.css sets --radius-lg:0.75rem(12px) — we revert it to 8px.
     For the 6px box silhouette use the arbitrary class `rounded-[6px]`. */
  --radius-sm: 4px;   /* rounded-sm  → inputs, small chips, send button */
  --radius-lg: 8px;   /* rounded-lg  → buttons, cards (README §7.1) */
  --radius-xl: 12px;  /* rounded-xl  → dialogs, sheets */

  /* Shadows — flat, warm-tinted neutral only (README §6.4) */
  --shadow-1: 0 1px 0 rgba(26,24,21,0.04), 0 1px 2px rgba(26,24,21,0.05);
  --shadow-2: 0 4px 12px rgba(26,24,21,0.06), 0 1px 3px rgba(26,24,21,0.04);

  /* Animations kept (restyled): pulse for processing dot + citation wash */
  --animate-pulse-dot: pulse-dot 1.4s ease-in-out infinite;
  --animate-amber-wash: amber-wash 2s ease-out;
}
```

- [ ] **Step 1.2: In `app/index.css` `@layer base`, update body defaults.** Set base font to sans (Geist), body color to `--color-ink`, page background to `--color-bg`:

```css
@layer base {
  * { @apply box-border; }
  html { @apply h-full; }
  body {
    @apply h-full m-0 p-0 font-sans antialiased;
    font-size: 15px;        /* README §6.5 body = 15px */
    line-height: 1.55;
    letter-spacing: -0.005em;
    color: var(--color-ink);
    background: var(--color-bg);
  }
  #root { @apply h-full; }
}
```

- [ ] **Step 1.3: In `app/index.css` `@layer utilities`, DELETE the AI-trope utilities** (README §4 checklist): remove `.bg-noise` (+ `::before`), `.glass`, `.glass-subtle`, `.bg-mesh-landing`, `.stagger-*`, and the `float`/`stagger-in`/`fade-scale-in` keyframes + their `--animate-*` (already dropped from `@theme`). Keep `.scrollbar-thin` and `.scroll-smooth`. Replace the old teal `pulse-highlight` keyframe with the new amber wash + processing dot pulse, wrapped for reduced-motion:

```css
@layer utilities {
  /* keep .scroll-smooth and .scrollbar-thin as-is */

  @keyframes pulse-dot {
    0%, 100% { opacity: 0.4; }
    50%      { opacity: 1; }
  }
  @keyframes amber-wash {
    0%   { background-color: var(--color-accent-soft); }
    100% { background-color: transparent; }
  }
  .animate-amber-wash { animation: var(--animate-amber-wash); }
  .animate-pulse-dot  { animation: var(--animate-pulse-dot); }

  @media (prefers-reduced-motion: reduce) {
    .animate-amber-wash, .animate-pulse-dot { animation: none; }
  }
}
```

- [ ] **Step 1.4: Add the wordmark dot helper** to `@layer utilities` (README §6.5 / §7.9 — pure CSS, no asset):

```css
@layer utilities {
  .mb-wordmark {
    font-family: var(--font-serif);
    font-style: italic;
    font-weight: 500;
    letter-spacing: -0.01em;
    display: inline-flex;
    align-items: center;
    gap: 0.34em;
  }
  .mb-wordmark .mark {
    width: 0.27em; height: 0.27em;
    border-radius: 9999px;
    background: var(--color-brand);
    display: inline-block;
  }
}
```

- [ ] **Step 1.5: Swap fonts in `app/routes/__root.tsx`.** First Read the file to confirm exact lines. **Replace ONLY the single Outfit stylesheet `<link>` entry** (the one whose href contains `family=Outfit…`). **Keep** the two generic `preconnect` entries and **keep** the `{ rel: "stylesheet", href: styles }` entry that loads the app's own CSS — do NOT delete or duplicate those. The replacement entry (Newsreader + Geist + Geist Mono, README §6.5):

```ts
{
  rel: "stylesheet",
  href: "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..600&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap",
},
```

Also in `__root.tsx`: change the `theme-color` meta (currently `#4f46e5` indigo, off-palette) to the brand ink-navy `#1F2D40`.

- [ ] **Step 1.6: Verify.** Run `npx tsc --noEmit` (expect clean) and `npm run build` (expect success). Then `npm run dev`, load `/` in Playwright, confirm: warm cream background, no mesh/noise/glass, body text renders in Geist. Existing screens will look half-styled (expected until later tasks) but must not error.

- [ ] **Step 1.7: Commit.**

```bash
git add app/index.css app/routes/__root.tsx
git commit -m "feat(design): apothecary tokens, fonts, flat global CSS"
```

---

## Task 2: UI primitives

Port the primitives from `prototype/shared.jsx` into Tailwind-classed React components against the new tokens. **Inline-styled prototype JSX must not be copied as-is (README §1)** — translate to Tailwind utilities.

**Files:**
- Create: `app/components/ui/Icon.tsx`
- Modify: `app/components/ui/Button.tsx`
- Modify: `app/components/ui/Chip.tsx`
- Create: `app/components/ui/Wordmark.tsx`
- Create: `app/components/ui/Mark.tsx`
- Create: `app/components/ui/SourceBadge.tsx`
- Create: `app/components/ui/Citation.tsx`
- Create: `app/components/ui/MetaRow.tsx`

- [ ] **Step 2.1: `Icon.tsx`** — export a typed `Icon` map of inline SVGs ported verbatim from `prototype/shared.jsx` lines 11–126 (camera, search, arrow, back, send, doc, download, refresh, close, molecule, scale, pill, building, chat, info, page, check, chevron, dot). Each is `(props: React.SVGProps<SVGSVGElement>) => JSX.Element` using `stroke="currentColor"`, `strokeWidth={1.5}` (except `check`=2, `chevron`=1.75). Color comes from the consumer via `text-*`.

- [ ] **Step 2.2: Rewrite `Button.tsx`** keeping the existing `ButtonProps extends ButtonHTMLAttributes` shape but changing the variant union and classes (README §7.1). **Remove `danger`.** Add optional `size?: "sm" | "md"` (default `md`) and keep `fullWidth`.

```tsx
type ButtonVariant = "primary" | "secondary" | "ghost" | "link";

const base =
  "inline-flex items-center justify-center gap-2 font-medium text-sm tracking-[-0.005em] " +
  "rounded-lg border border-transparent transition-colors duration-150 " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

const sizes = {
  md: "min-h-[48px] px-[18px] py-3",
  sm: "min-h-[44px] px-[14px] py-2 text-[13px]",
};

const variants: Record<ButtonVariant, string> = {
  primary:   "bg-brand text-white hover:bg-brand-deep",
  secondary: "bg-paper text-ink border-border hover:bg-tint",
  ghost:     "bg-transparent text-ink-2 hover:bg-tint",
  link:      "bg-transparent text-brand underline underline-offset-4 decoration-faint hover:decoration-brand p-0 min-h-0 border-0",
};
```

Compose `base + sizes[size] + variants[variant] + (fullWidth ? " w-full" : "")`. **Never `rounded-full`.** (Two-line CTA label + subtitle handled per-screen in Task 3, not baked into the primitive.)

- [ ] **Step 2.3: Restyle `Chip.tsx`** (keep `ChipProps extends ButtonHTMLAttributes` + `active?`). 8px radius, not pill (README §7.2):

```tsx
const base = "inline-flex items-center gap-1.5 min-h-[40px] px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150";
const active  = "bg-brand-soft text-brand-ink border border-brand/20";
const inactive = "bg-tint text-ink-2 border border-border hover:bg-paper";
```

- [ ] **Step 2.4: `Wordmark.tsx`** — `({ size = 22, className }: { size?: number; className?: string })` rendering `<span className="mb-wordmark ..." style={{ fontSize: size }}><span className="mark" />Medabot</span>` (uses the `.mb-wordmark` CSS from Task 1.4). No two-tone, no inline mark SVG (README §7.9).

- [ ] **Step 2.5: `Mark.tsx`** — port `MarkLeaflet`/`Mark` from `prototype/shared.jsx:134-154` (and `prototype/marks.jsx`) as `({ size=22, color="currentColor", accent, paper }) => JSX`. Used only for icons/favicon/splash, **not** inline with the wordmark. (No app-chrome usage required this task — just make it available.)

- [ ] **Step 2.6: `SourceBadge.tsx`** (README §7.3) — `({ medicine }: { medicine?: string })`:

```tsx
<span className="inline-flex items-center gap-1.5 px-2 py-1 bg-surface border border-border rounded text-[11px] text-ink-2">
  <Icon.check className="w-2.5 h-2.5 text-brand" />
  <span>Folheto oficial{medicine ? ` · ${medicine}` : ""}</span>
</span>
```

**Never name a regulatory body in the visible badge (README §7.3).**

- [ ] **Step 2.7: `Citation.tsx`** (README §7.4 — the product's identity). Props `{ page: number; onJump: (page: number) => void }`:

```tsx
<button
  onClick={() => onJump(page)}
  aria-label={`Ir para página ${page} do folheto`}
  className="inline-flex items-baseline gap-1 px-2 py-0.5 bg-accent-soft text-accent-ink rounded text-[12px] font-medium hover:brightness-95"
>
  <span className="font-mono text-[11px] opacity-70">p.</span>
  <span>{page}</span>
</button>
```

Also export a `CitationRow({ pages, onJump }: { pages: number[]; onJump: (p:number)=>void })` rendering the `FONTE` eyebrow + the chips (README §7.4 markup). Render nothing if `pages` is empty.

- [ ] **Step 2.8: `MetaRow.tsx`** (README §7.7) — `({ items }: { items: { label: string; value: string; serif?: boolean }[] })`:

```tsx
<div className="flex flex-col gap-2.5">
  {items.map((it) => (
    <div key={it.label} className="flex items-baseline gap-3">
      <span className="text-[11px] uppercase tracking-wider text-muted w-[90px] flex-shrink-0">{it.label}</span>
      <span className={`${it.serif ? "font-serif text-[17px]" : "text-[14px]"} text-ink`}>{it.value}</span>
    </div>
  ))}
</div>
```

- [ ] **Step 2.9: Verify.** `npx tsc --noEmit` clean; `npm run build` succeeds. Primitives aren't mounted yet — this just confirms they compile.

- [ ] **Step 2.10: Commit.**

```bash
git add app/components/ui
git commit -m "feat(ui): apothecary primitives (Button, Chip, Icon, Wordmark, Mark, SourceBadge, Citation, MetaRow)"
```

---

## Task 3: Landing screen

**Files:** Modify `app/components/LandingPage.tsx` (keep props `{ onScanMedicine, onManualEntry }`).
**Reference:** README §8.1 + `prototype/screen-landing.jsx`. **Use the exact Portuguese copy from README §8.1/§9 — do not invent.**

- [ ] **Step 3.1:** Rebuild layout: `bg-bg` full-bleed, **no mesh/orbs/mascot**. Top bar (20px padding): `<Wordmark/>` left, `PT · BETA` eyebrow right (`text-[11px] uppercase tracking-[0.12em] text-muted`).
- [ ] **Step 3.2:** Hero block (centered vertically, left-aligned): eyebrow `Sem opiniões. Sem suposições.` (`text-brand`, eyebrow style); H1 `Informação clara sobre o seu medicamento.` in `font-serif text-[40px] leading-[1.05] tracking-[-0.02em] [text-wrap:pretty]` (no forced `<br>`); subhead `Em vez de procurar no Google, pergunte ao folheto informativo.` (`text-[15px] text-ink-2`).
- [ ] **Step 3.3:** Two stacked full-width CTAs (two-line labels). Primary → `onScanMedicine`: `bg-brand text-white`, `Icon.camera` + bold line `Fotografar caixa` + subtitle `Aponte à embalagem` (`text-[12px] opacity-60`) + trailing `Icon.arrow`. Secondary → `onManualEntry`: `bg-paper border border-border text-ink`, `Icon.search` + `Procurar pelo nome` + subtitle `Nome, substância ou dosagem` (`text-muted`) + `Icon.chevron`. 16px padding, `rounded-lg`. Build these as bespoke buttons in the screen (the two-line label is screen-specific) but match Button's radius/min-height.
- [ ] **Step 3.4:** Footer disclaimer (single small line): `O Medabot ajuda a perceber o folheto. Não substitui o aconselhamento do seu médico ou farmacêutico.` (`text-[11px] text-muted`). **This is the ONE landing disclaimer.**
- [ ] **Step 3.5: Verify** (`tsc`, `build`, Playwright vs `screen-landing.jsx`). Confirm singular copy and no mascot/mesh.
- [ ] **Step 3.6: Commit** `feat(landing): apothecary landing screen + final copy`.

---

## Task 4: Entry-flow screens (Search, Camera, Processing, Disambiguation)

**Files:** Modify `app/components/SearchScreen.tsx`, `Camera.tsx`, `ProcessingScreen.tsx`, `DisambiguationCard.tsx`. Keep all props. **Camera: keep every bit of react-webcam capture logic (§13) — restyle chrome only.**
**Reference:** README §8.2–§8.5 + `prototype/screen-extras.jsx`, `prototype/screen-disambiguation.jsx`.

- [ ] **Step 4.1: SearchScreen (§8.2).** Mobile header (`Icon.back` → `onCancel`, `<Wordmark/>`). Hero (24px): eyebrow `PROCURAR`, H1 `Que medicamento quer consultar?` (serif 32px), sub `Escreva o nome, a substância ativa ou a dosagem. Combine para resultados mais precisos.`. Search input: `bg-paper border border-ink rounded-lg` 10/14 padding + `Icon.search`, free text. Link `Procurar com mais detalhe →` → `onAdvancedSearch`. Examples: eyebrow `TENTE, POR EXEMPLO` + 4 hairline-separated rows (name serif 17px + substance 12px muted + `Icon.chevron`); clicking a row sets input value (keep current submit wiring → `onSubmit`). Bottom fixed hint card with `Icon.camera`: "Tem a caixa em mãos? Fotografar" → call the new optional `onOpenCamera?` prop (wired in `App.tsx` to `setScreen({name:"camera"})`; render the hint as a plain affordance even if the prop is absent, but only make it actionable when provided). **Do not fall back to `onCancel`/landing** (that breaks §8.2).

- [ ] **Step 4.1b: ManualMedicineForm (`app/components/ManualMedicineForm.tsx`).** Not in README §8 but it exists in the app (the "Procurar com mais detalhe →" / advanced-search target) and uses old tokens — after Task 1 it would look broken. Restyle it to match: header (back + `<Wordmark/>`), eyebrow `PROCURAR COM MAIS DETALHE`, serif H1, labeled text inputs (`bg-paper border border-border rounded-lg`, eyebrow-style labels), primary `Button` submit. Keep ALL existing props (`onSubmit, onCancel, onCancelToLanding?, initialData?`) and form/validation logic unchanged — visual only.
- [ ] **Step 4.2: Camera (§8.3).** Dark viewfinder `bg-[#0E0D0B]` full-screen. Top bar: `Icon.close` (→ `onCancel`) left, centered caption with leading amber dot + `Aponte à embalagem`. Viewfinder: faint dashed white rectangle silhouette + **corner brackets in `text-accent` (amber)**; helper line `A foto fica entre nós. Não é guardada.`. **Remove the old white-rectangle SVG cutout.** Bottom bar: left text button `Procurar\npelo nome` (→ `onManualEntry`/cancel as currently wired), center 72×72 white capture button (scales on press) wired to the **existing** capture handler, right text button `Usar foto\nexistente` opening the existing file picker. Keep flash-on-capture + screenshot quality.
- [ ] **Step 4.3: ProcessingScreen (§8.4) + StepDot.** Header `Icon.close` + `<Wordmark/>`. Title: eyebrow `A PROCESSAR`, H1 serif 28px `A ler o folheto.` `<br/>` `Demora uns segundos.`. Identified-medicine card (`bg-paper rounded-xl p-4`): 64×80 box silhouette left (see Task 6 silhouette spec), right eyebrow `IDENTIFICADO` (`text-brand`) + `medicineInfo.name` (h3) + mono subtitle `{activeSubstance} · {dosage} · {pharmaceuticalForm}`. Steps list (hairline-separated, 14px vertical padding) driven by the existing props.

  **`StepDot`** (states per README §8.4): `done`=22px brand-filled circle w/ white `Icon.check`; `active`=22px brand-border ring + inner 8px brand dot using `animate-pulse-dot`; `pending`=22px dashed `border-faint`; `failed`=22px `bg-error` circle + white close. Active step shows trailing `em curso` (`font-mono text-[11px] text-brand`); done shows check.

  **5 step ids → 4 visible rows (explicit map).** The current App passes 5 steps (`identify, fetch, process, overview, ready`) with old labels. Render exactly 4 rows with NEW labels, ignoring `step.label`, by mapping on `step.id`:
  | Visible row | Driven by id(s) | Label |
  |---|---|---|
  | 1 | `identify` | `A identificar o medicamento` |
  | 2 | `fetch` | `A obter o folheto oficial` |
  | 3 | `process` | `A ler as {N} páginas` (interpolate `totalPages` if known, else `A ler o folheto`) |
  | 4 | `overview` **+** `ready` | `A preparar o resumo` (active when `currentStep` ∈ {overview, ready}; done only when `ready` is in `completedSteps`) |

  Footer caption (centered, muted): `As respostas aparecem em segundos. Não saímos do folheto oficial.`.

  **Error recovery (do NOT drop it).** When `failedStep` is set: render that row's StepDot as `failed`, and **below the steps list** surface the recovery actions the old panel provided, restyled as new primitives — a primary `Tentar novamente` (`onRetryStep(failedStep)`) plus secondary/link actions `Fotografar` (`onGoToCamera`), `Procurar pelo nome` (`onGoToManualForm`), `Recomeçar` (`onReset`), driven by the same `classifyProcessingError` branching the current screen uses. Use `processingError`/`searchMessage` for the message line (`text-error` for genuine errors). Only the *chrome* changes — the recovery affordances stay.
- [ ] **Step 4.4: DisambiguationCard (§8.5).** Header back + `<Wordmark/>`. Title: eyebrow `CONFIRMAÇÃO NECESSÁRIA`, H1 serif 26px `Qual destes é o seu?`, sub `Para mostrar o folheto certo, preciso de saber exatamente que medicamento tem em mãos. Compare com a sua caixa.`. **REMOVE the similarity percentage entirely.** Sort by `similarity` desc; render top candidate under `MAIS PROVÁVEL` eyebrow with `bg-brand-soft` + brand border; the rest under `OUTRAS OPÇÕES COM ESTE NOME` with `bg-paper` + border. Each row: name serif 19px + mono dosage; then labelled rows (substance/form/holder) via small inline meta; `Icon.chevron` right; click → `onSelect(candidate)`. Footer link `Nenhum corresponde — refinar pesquisa` (em-dash) → `onNoneMatch`.
- [ ] **Step 4.5: Verify** each screen (`tsc`, `build`, Playwright vs `screen-extras.jsx` / `screen-disambiguation.jsx`). Confirm: no `%` on disambiguation, amber brackets on camera, privacy line present, pulsing active dot.
- [ ] **Step 4.6: Commit** `feat(screens): apothecary search/camera/processing/disambiguation`.

---

## Task 5: Chat screen + behaviours

**Files:** Modify `app/components/Chat.tsx`; create `app/hooks/useRotatingPlaceholder.ts`. Keep props `{ pdfData, medicineName, initialOverview? }` and the `ChatMessage` shape.
**Reference:** README §8.6, §7.4–§7.6, §10 + `prototype/screen-chat.jsx`.

- [ ] **Step 5.0: Pre-check (README §5).** Read `Chat.tsx` and confirm there are NO leftover Git merge-conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`). If any exist, STOP and surface to the user before refactoring.
- [ ] **Step 5.1: `useRotatingPlaceholder.ts`** (README §11/§10) — `useRotatingPlaceholder(options: string[], active: boolean, intervalMs = 4500): string`. Cycles via `setInterval`; pauses (returns current/first) when `active` is false (i.e., input focused or non-empty). Respect `prefers-reduced-motion` (no rotation → return `options[0]`).
- [ ] **Step 5.2: Header + Refazer (Chat-local) + optional back.** Add optional props `onBack?: () => void` and `dosage?: string` to `ChatProps` (additive; existing callers unaffected). Remove the old blue "Respostas baseadas no folheto…" banner. Two-row header on `bg-bg`, bottom-bordered: row 1 = `Icon.back` left (render only if `onBack` given), `<Wordmark/>` centered, `Refazer` text button right; row 2 = `medicineName` (serif 22px) + mono `dosage` (when provided) left, `<SourceBadge medicine={medicineName} />` right. **Use the existing `useMediaQuery` hook to hide ROW 1 at ≥64rem** (desktop top bar provides that chrome) and show it below 64rem; row 2 always shows. **"Refazer" is a Chat-local handler** that **directly sets** the local `messages` state to a fresh seed overview message rebuilt from `initialOverview` (do NOT clear to `[]` — the seed `useEffect` is guarded by `messages.length === 0` and deps `[initialOverview]`, so it would not re-fire). It calls **no** prop and **no** backend. `onBack` (when provided) is wired by App to `handleReset`.
- [ ] **Step 5.3: AssistantMessage (§7.5 + §6.5 — SERIF body).** Vertical-rule blockquote, **no bubble**. `pl-4` with an absolute `w-0.5 bg-brand rounded-sm` rule (opacity 1 when `isOverview`, else 0.4). When `isOverview`, render the `Resumo do folheto` eyebrow above. Body uses the **serif** family (README §6.5: "serif for AI-assistant body in chat … feels like a quotation"): `font-serif text-[15px] leading-[1.6] text-ink` via the existing markdown renderer. Highlighted phrases get `bg-accent-soft text-accent-ink px-1 rounded-sm` (use sparingly — keep existing highlight logic if any, else none).
- [ ] **Step 5.4: UserMessage (§7.6).** Right-aligned bubble `bg-brand-soft text-brand-ink px-3.5 py-2.5 max-w-[78%] text-[14.5px] font-medium` with `borderRadius: "16px 16px 4px 16px"`.
- [ ] **Step 5.5: Citation row.** After each assistant message render `<CitationRow pages={msg.sourcePages ?? []} onJump={usePDF().jumpToPage} />` (Task 2.7). Make it prominent. On mobile, `jumpToPage` already sets `activeTab="pdf"` (PDFContext) — no extra call needed; verify it lands on the Folheto tab.
- [ ] **Step 5.6: Suggested questions (§8.6 + §14 Q1).** Replace the hardcoded `sampleQuestions` array (current `Chat.tsx:159-163`) with a call to the existing `suggestFollowUps` server fn after each assistant answer (input `{ lastAnswer, medicineName }`, returns `string[]`). Render under a `SUGESTÕES` eyebrow as a **vertical text-link list** — each a button with a leading amber `Icon.arrow` + question (`text-sm`). Clicking submits that question (existing submit path). Refresh after each assistant response; **always** fall back to the static trio if the call returns empty/throws. **First verify the server fn actually returns data:** Read `app/server/suggestFollowUps.ts`; if it uses `response_format: { type: "json_object" }` while prompting for a bare array (so `parsed.questions`/`parsed.followUps` is always `undefined` → returns `[]`), apply the **minimal** fix to make it return real questions (e.g. ensure the prompt instructs a `{"questions": [...]}` object and parse that key). This is the single §13 exception sanctioned by README §8.6/§10's "wire this up" instruction; do not change the function's signature or call sites.
- [ ] **Step 5.7: Composer.** `bg-paper border border-border rounded-lg`; text input left + 36×36 `bg-brand` send button (`rounded-sm`/4px) right with `Icon.send`. Placeholder uses `useRotatingPlaceholder(["Posso tomar com café?","E se for grávida?","Há interações com álcool?"], active)` where `active = !inputFocused && input.length === 0`.
- [ ] **Step 5.8: States.** Empty (no messages): centered small icon + `Pergunte o que precisar sobre {medicineName}.`. "Not found" assistant answer: dashed-bordered `bg-tint`/grey italic paragraph + `Icon.search`, phrase `Não encontro essa informação no folheto.` (keep existing detection). Error (`type:"error"`): `bg-error-soft text-error` box + `Não foi possível obter uma resposta. Pode tentar novamente.` + a `Tentar novamente` link that re-submits `retryQuestion` (keep existing retry wiring). **No footer disclaimer on Chat** (README §8.6 — disclaimer lives only on Medicine panel).
- [ ] **Step 5.9: Verify** (`tsc`, `build`, Playwright vs `screen-chat.jsx`): blockquote rule (solid intro / 0.4 follow-ups), amber citation chips that jump the PDF, vertical SUGESTÕES list, rotating placeholder (and static under reduced-motion).
- [ ] **Step 5.10: Commit** `feat(chat): document-as-conversation chat, citations, suggestions wiring, rotating placeholder`.

---

## Task 6: Medicine info panel

**Files:** Modify `app/components/MedicineInfoPanel.tsx`. Keep props `{ medicineInfo, image, pdfData, summary?, onReset, onDownloadPdf, onForceRefresh }`.
**Reference:** README §8.7 + `prototype/screen-medicine.jsx`.

- [ ] **Step 6.1:** Header: `Icon.back`, `<Wordmark/>`, `<SourceBadge medicine={medicineInfo.name} />` right.
- [ ] **Step 6.2:** Hero (24px): eyebrow category from `summary?.category` (e.g. `ANALGÉSICO · ANTIPIRÉTICO`) in `text-brand`; H1 serif 34px = `medicineInfo.name`; mono subtitle 15px `{dosage} · {pharmaceuticalForm}`.
- [ ] **Step 6.3:** Identity card (`bg-paper rounded-xl p-4`): left box silhouette (Step 6.6), right `<MetaRow items=[{label:"SUBSTÂNCIA", value:activeSubstance, serif:true}, {label:"FORMA", value:pharmaceuticalForm}, {label:"TITULAR", value:titular}]/>`. **Replaces the chip wall.** Omit rows with no value.
- [ ] **Step 6.4:** `PARA QUE SERVE` section: eyebrow + numbered ordered list (mono number prefixes) from `summary?.indications`. Label is the only change; data unchanged.
- [ ] **Step 6.5: "Importante saber" callout (§8.7 + §14 Q2 — REVISED, no new query).** Add optional `overview?: string` to `MedicineInfoPanelProps` and pass the already-generated overview from `App.tsx`. Client-side, extract the relevant sentence(s) from `overview` — split into sentences and pick those mentioning dose/max-dose or alcohol/interaction (PT keywords: `dose`, `máxim`, `álcool`, `alcool`, `interaç`). **Render the callout only if at least one relevant sentence is found AND it is not a "not found" response** (reuse the same 3-variant `não encontro/encontrei/consta` matching as Chat). Markup: `bg-accent-soft border-l-2 border-accent p-4`, eyebrow `IMPORTANTE SABER` (`text-accent-ink`), body 13.5px. The inline `Ver mais no folheto →` link calls `usePDF().setIsPdfViewerOpen(true)` + `setActiveTab("pdf")` (open the leaflet; we have no per-sentence page number, so do not fabricate a `jumpToPage` target). **No `queryLeafletPdf` call, no backend.**
- [ ] **Step 6.6: Box silhouette (§8.7).** CSS rectangle 88×110 (mobile) / 74×92 (desktop), `rounded-[6px]`, `bg-gradient-to-b from-[#FBFBFB] to-[#F0EDE6]`; inside: 28×3px brand bar top, name tiny serif 10px, mono dosage 7px, `20 COMP.` 6px muted caps bottom. If `image` (captured photo) exists, swap for `<img src={image} className="rounded-[6px] ring-1 ring-border object-cover" />`.
- [ ] **Step 6.7: Action stack (§8.7).** Primary full-width `Abrir folheto` (`Icon.doc` + brand) → opens PDF (`usePDF().setIsPdfViewerOpen(true)` / `setActiveTab("pdf")`). Below, centered text-link row: `↓ Guardar PDF` (→ `onDownloadPdf`) `·` `↻ Procurar novamente` (→ `onForceRefresh` or `onReset` per current wiring). **Remove the old "Nova pesquisa" ghost button.**
- [ ] **Step 6.8: Single disclaimer** below the stack (`text-[11px] text-muted`) — the ONLY disclaimer instance in the results area.
- [ ] **Step 6.9: Verify** (`tsc`, `build`, Playwright vs `screen-medicine.jsx`): MetaRow not chips, callout appears/omits correctly, silhouette renders, copy matches §9 (`Abrir folheto`, `Guardar PDF`, `Procurar novamente`, `PARA QUE SERVE`).
- [ ] **Step 6.10: Commit** `feat(medicine): metarow identity, importante-saber callout, simplified actions`.

---

## Task 7: PDF viewer, layouts, Card cleanup

**Files:** Modify `app/components/PDFViewer.tsx`, `layouts/DesktopLayout.tsx`, `layouts/MobileLayout.tsx`, `layouts/TabLayout.tsx`, `layouts/ResponsiveContainer.tsx`. Possibly delete `app/components/ui/Card.tsx` (**ASK USER FIRST**).
**Note:** the left medicine column is hard-coded `17.5rem` at **two** spots in `DesktopLayout.tsx` (~lines 68 & 70) — change both to `20rem`. The PDF column min is `25rem` (~line 37) — keep it.
**Reference:** README §8.8, §7.8 + `prototype/screen-desktop.jsx`.

- [ ] **Step 7.1: DesktopLayout (§8.8) + reset wiring.** Thread `onReset?` through: `ResponsiveContainer` already receives `onReset` — pass it into `DesktopLayout` too (currently only `MobileLayout` gets it). Add `onReset?` to `DesktopLayoutProps`. Top bar (single hairline-bordered line): `<Wordmark/>` + `PT · BETA` left; `<SourceBadge/>` + `Nova pesquisa` text link (→ `onReset`) right. Set the left medicine column to `20rem` (320px per §8.8; was 17.5rem); keep the flex center and the resizable right PDF column with the **existing resize-handle drag behaviour** (do not hard-code 380 — keep the dynamic width + handle). Remove shadows; use hairline `border-rule` dividers.
- [ ] **Step 7.2: PDFViewer header strip.** Eyebrow `FOLHETO INFORMATIVO` + `Página {currentPage} de {totalPages}` (n in `font-mono`). Prev/next 28×28 square buttons, `border-ink rounded-sm` (4px), **no `rounded-full`**. Page wrapper `bg-[#FEFCF7]` + 1px border + `shadow-1`.
- [ ] **Step 7.3: Amber citation wash (§14 Q3 fallback).** Replace the teal `animate-pulse-highlight` on jump with the full-page `animate-amber-wash` (Task 1.3), still keyed off `lastJumpedPage`. Keep `renderTextLayer={false}` — no region highlight. Honour reduced-motion (handled by the CSS media query).
- [ ] **Step 7.4: PDF error state (§8.8).** Replace bare "Failed to load PDF file" with centered: eyebrow `FOLHETO NÃO DISPONÍVEL`, serif 16px `Não foi possível carregar o folheto agora.`, two text links `Tentar novamente` (existing refetch) + `Abrir no site oficial` (external link if a cached leaflet URL is available; omit the link if not).
- [ ] **Step 7.5: MobileLayout + TabLayout (§7.8).** Bottom tab bar on `bg-surface` + top `border-border`, 3 tabs **`Conversa` / `Medicamento` / `Folheto`** (rename "Chat"→"Conversa"; "pdf" tab still gated by `showPdfViewer`). Active: `text-brand` + 500 weight + 16×2 pill underline; inactive `text-muted` 400. `padding-bottom: env(safe-area-inset-bottom)`. Icons above labels (`Icon.chat`/`Icon.info`/`Icon.page`). Keep TabLayout's mounted-tabs behaviour and the `activeTab` from PDFContext.
- [ ] **Step 7.5b: FloatingBackButton.** It renders "Voltar ao Chat" when `cameFromChat` (PDF tab/viewer). Restyle to the new tokens (`bg-brand text-white rounded-lg`, `Icon.back`, label `Voltar à conversa` to match the "Conversa" rename) and confirm it doesn't visually collide with the new PDF header strip. Keep its existing PDFContext-driven show/hide logic.
- [ ] **Step 7.6: Card.tsx.** README §5 says "likely delete or simplify". Grep for `ui/Card` imports. If still used after Tasks 3–6, simplify it to a hairline-bordered section (`bg-surface border border-border rounded-lg`, no heavy shadow/2xl radius). If unused, **ask the user before deleting** (per their explicit instruction) — in this autonomous run, since deletion is blocked without confirmation, leave the unused file in place and note it in the PR description for the user to delete.
- [ ] **Step 7.7: Verify** (`tsc`, `build`, Playwright vs `screen-desktop.jsx`): desktop top bar + 3 cols + resize works, amber wash on citation click, square PDF nav buttons, mobile tabs labelled `Conversa/Medicamento/Folheto` with pill underline.
- [ ] **Step 7.8: Commit** `feat(layout): apothecary desktop topbar, PDF strip + amber wash, mobile tabbar`.

---

## Task 8: Cross-screen polish, asset & full-flow verification

**Files:** `app/components/App.tsx` (wiring), plus as needed across the above; `public/` icons.

- [ ] **Step 8.0: App.tsx wiring (consolidate + verify).** Confirm all additive optional props are passed from `App.tsx`/`ResponsiveContainer` (wiring only — no pipeline/state changes; ideally done alongside each screen task, verified here): `<SearchScreen onOpenCamera={() => setScreen({ name: "camera" })} … />`; `<MedicineInfoPanel overview={overview} … />`; `<Chat onBack={handleReset} dosage={medicineInfo.dosage} … />` (single shared instance — Chat itself hides row-1 on desktop via `useMediaQuery`); and `onReset` threaded `ResponsiveContainer → DesktopLayout` so the desktop top-bar "Nova pesquisa" fires `handleReset`. Confirm `npx tsc --noEmit` stays clean.
- [ ] **Step 8.1: Disclaimer audit.** Grep the codebase for the disclaimer string fragments; confirm it appears **only** on Landing (Task 3.4) and the Medicine panel (Task 6.8) — remove any leftover third instance (README §8.6/§8.7).
- [ ] **Step 8.2: Anti-trope + stale-token sweep.** Grep the `app/` tree and fix any survivors of: `glass`, `bg-mesh`, `bg-noise`, `stagger-`, `shadow-primary`, `animate-float`, `Outfit`; old color tokens that no longer exist in the new `@theme` (`primary-50`/`primary-600`/etc., `accent-500`/teal `accent-*`, `success-*`, `warning-*`, `error-50`/`error-100`/`error-200`/`error-500`/`error-600`/`error-700`, `surface-secondary`/`surface-tertiary`) — these render as no-op/invisible classes once the theme is swapped; replace with the new tokens (`error`, `error-soft`, `brand`, `accent`, `surface`, `tint`, etc.); `rounded-full` on buttons/chips (allowed exceptions: circular StepDot, camera capture button, tab-underline pill); the two-tone `Meda`+`Bot` wordmark; any visible regulatory-body name (`INFARMED`, `EMA`) in chrome/badges (§7.3); and `#4f46e5` / indigo `theme-color`. Fix each.
- [ ] **Step 8.3: Reduced-motion check.** Confirm pulse-dot + amber-wash + placeholder rotation are all disabled under `prefers-reduced-motion: reduce` (README §10).
- [ ] **Step 8.4: Mascot removal from chrome + app icons (§5/§7.9/§12).** The high-impact asset change is **removing the AI-mascot `public/logo.png` from app chrome** — the current `MobileLayout` header shows logo + "MedaBot" text; replace it with `<Wordmark/>` (handled in Task 7.5). Grep for `logo.png` / mascot `<img>` usages across `app/` and replace with `<Wordmark/>` or remove. For PWA/favicon re-export from the `Mark` SVG (icon-192/512, apple-touch, favicon): attempt with an available tool (e.g. `npx sharp` or `sharp-cli` if installable, or `rsvg-convert`/`sips`); if no rasterizer is available without network installs, leave the existing icon files and note this in the PR description as a follow-up (non-blocking — does not affect in-app visuals). Do **not** wire the mascot back into chrome.
- [ ] **Step 8.5: Full-flow Playwright walkthrough.** Run `npm run dev`; drive landing → search (or camera) → processing → (disambiguation if triggered) → results (chat + medicine + PDF). Capture a screenshot of each screen and compare side-by-side with the matching `prototype/screen-*.jsx` artboard from `Medabot Revamp.html`. Note any fidelity gaps and fix.
- [ ] **Step 8.6: Final verify.** `npx tsc --noEmit` clean, `npm run build` succeeds.
- [ ] **Step 8.7: Commit** `chore(ui): cross-screen polish, anti-trope sweep, reduced-motion`.

---

## Self-review notes (author)

- **Spec coverage:** §6→T1; §7→T2; §8.1→T3; §8.2–8.5→T4; §8.6→T5; §8.7→T6; §8.8→T7; §9 copy folded into each screen task; §10 behaviours→T1(motion)/T5(suggestions,placeholder,citation jump)/T7(amber wash); §11 hook→T5.1; §12 assets→T2.5/T8.4; §13 "no backend"→honoured (only existing server fns called); §14 decisions→baked in per task.
- **Type consistency:** screen props and `ChatMessage`/`Candidate`/`MedicineSummary`/`IdentifyMedicineResponse` field names verified against current source; `sourcePages` (not `pages`) used in Citation wiring.
- **Resolved cycle-1/cycle-2 findings (final):** (a) Search→camera uses the new additive optional `SearchScreen.onOpenCamera?` wired in App to `setScreen({name:"camera"})` — no landing fallback; (b) "Importante saber" is sourced from the existing `overview` prop client-side — **no** `queryLeafletPdf` call, omits gracefully; (c) "Refazer" is Chat-local (resets `messages` to the overview seed) — it does NOT map to `handleForceRefresh`/`handleReset` and introduces no Chat/App desync; (d) all additive-prop wiring lives in `App.tsx`/`ResponsiveContainer.tsx` (Task 8 / Step 8.0, Task 7.1) — both are in the file lists; (e) `suggestFollowUps` is confirmed to return `[]` (json_object vs array-prompt) — Task 5.6 edits the **prompt** (existing parse already reads `.questions`) as the single sanctioned §13 exception.
- **Verification is qualitative** (no pixel-diff harness); single-PR branch is visually half-styled between Task 1 and the screen tasks — do not deploy mid-stack.
