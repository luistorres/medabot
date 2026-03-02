# MedaBot 🤖💊

An AI-powered medicine identification and information system for Portugal. It uses computer vision to identify medicines from photos, retrieves official patient leaflets from INFARMED's regulatory database, and enables natural language Q&A over the leaflet content using RAG — all constrained to official documentation.

## 🏗️ Architecture & Technologies

### Frontend

- **React 19** + **TanStack Start** (RC) — Full-stack React with SSR
- **TanStack Router** — Type-safe file-based routing
- **Tailwind CSS 4** — Utility-first styling with custom design tokens
- **react-webcam** — Camera capture for medicine photography
- **react-pdf** — In-app PDF viewer with pinch-zoom and swipe navigation
- **TypeScript** — Strict mode throughout

### Backend & Processing

- **Vite 7** + **Nitro** — Build tooling and server runtime
- **OpenAI SDK** — Vision API (identification), Embeddings + Chat (RAG)
- **Playwright** — Headless Chromium for INFARMED web scraping
- **better-sqlite3** — Local SQLite database with FTS5 full-text search
- **pdf-parse** — PDF text extraction
- **Zod** — Schema validation for AI responses

### Infrastructure

- **Fly.io** — Docker deployment (Paris CDG region)
- **Persistent volume** — SQLite database at `/data/medabot.db`
- **Auto-scaling** — 0 min machines, 1GB RAM, shared CPU

## 🔄 Processing Pipeline

### Step 1: Medicine Identification

**Model**: `gpt-4o-mini` (Vision API)

- Analyzes uploaded medicine photos (camera, search, or manual entry)
- Extracts structured data: name, brand, active substance, dosage, pharmaceutical form
- Zod schema validation ensures type-safe, well-formed responses
- Portuguese-focused prompts optimized for pharmaceutical packaging

### Step 2: Regulatory Document Retrieval

**Technology**: SQLite FTS5 + Playwright

This step uses a multi-layer search strategy with progressive fallback:

1. **Cache check** — SQLite-backed PDF cache (30-day TTL) for instant hits
2. **Local database search** — FTS5 full-text search over INFARMED's authorized medicines catalog (`authorized.xlsx`, ~50k entries) with BM25 ranking and Levenshtein re-ranking
3. **Playwright scraping** — Headless Chromium automates INFARMED's search form as a last resort, with 5 progressive search strategies (name+substance+dosage → name+substance → name → first word → substance only)

When multiple matches are found, the app returns candidates for **user disambiguation** before downloading the PDF. A **Playwright warmup pool** pre-launches the browser in the background during disambiguation to minimize wait time.

PDF downloads use network interception and are validated (checking `%PDF` header) before caching.

### Step 3: Document Processing

**Technology**: `pdf-parse` + OpenAI `text-embedding-3-small`

- Extracts full text from the patient leaflet PDF
- Custom paragraph-aware text splitter (800-char chunks, 150-char overlap) that respects paragraph and sentence boundaries
- Batch-embeds all chunks via OpenAI's embedding API
- Stores `ChunkWithEmbedding[]` in memory with estimated page numbers
- Chunks are cached by PDF SHA-256 hash across queries

### Step 4: Overview Generation

**Model**: `gpt-4o-mini`

- Queries the embedded chunks to extract therapeutic category and indications
- Generates a structured medicine summary displayed alongside the chat

### Step 5: RAG Chat

**Model**: `gpt-4o-mini` (temperature 0.1)

- Embeds user questions and performs cosine similarity search (top-6 chunks)
- Assembles context with page citations
- System prompt constrains answers strictly to leaflet content
- Responses include page references that link directly to the PDF viewer
- Follow-up question suggestions generated after each answer

## 🖥️ UI Architecture

### Responsive Layouts

The app detects the viewport at runtime (`64rem` breakpoint) and renders one of two layouts:

- **Desktop** — 3-column grid: fixed sidebar (medicine info) | flexible center (chat) | resizable right panel (PDF viewer with drag handle)
- **Mobile/Tablet** — Tab-based navigation (Chat | Medicine | PDF) with a bottom tab bar, safe area insets, and swipe/pinch gestures

### Screen Flow

```
Landing → Camera / Search / Manual Form → Processing → Results
                                              ↓
                                        Disambiguation (if multiple matches)
```

### Key UI Features

- Camera with SVG framing guide and flash effect on capture
- Search input with AI-powered query parsing (extracts medicine fields from free text)
- Step-by-step processing tracker with live status updates
- Disambiguation card with similarity scores and scroll hints
- Chat with markdown rendering, clickable page references, and typing indicators
- PDF viewer with pinch-to-zoom (0.5x–3x), swipe navigation, and floating back button
- All custom UI primitives (Button, Card, Chip) — no external component library

## 🛡️ Safety & Reliability

- **Source constraint** — AI responses limited strictly to official leaflet content
- **Medical disclaimers** — Clear guidance to consult healthcare professionals
- **PDF validation** — Verifies `%PDF` header before caching downloads
- **Graceful degradation** — Local DB → Playwright → progressive search fallbacks
- **Cache layers** — PDF cache (SQLite, 30-day TTL) + chunk cache (in-memory, SHA-256 keyed)

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .envrc.example .envrc
# Add your OPENAI_API_KEY

# Start development server
npm run dev

# Build for production
npm run build
npm start
```

## 📁 Project Structure

```
app/
├── core/               # Business logic
│   ├── identify.ts         # OpenAI Vision identification
│   ├── regulatoryPdf.ts    # INFARMED scraping + PDF retrieval
│   ├── leafletProcessor.ts # PDF chunking, embedding, RAG queries
│   ├── localSearch.ts      # FTS5 local medicines search
│   ├── playwrightPool.ts   # Browser instance warmup pool
│   ├── db.ts               # SQLite database + PDF cache
│   ├── seedMedicines.ts    # Authorized medicines catalog loader
│   ├── textUtils.ts        # Levenshtein string similarity
│   └── llm.ts              # OpenAI client singleton
├── server/             # Server functions (createServerFn wrappers)
├── components/         # React components
│   ├── layouts/            # DesktopLayout, MobileLayout, TabLayout
│   └── ui/                 # Button, Card, Chip, FloatingBackButton
├── context/            # React Context (PDFContext)
├── hooks/              # useMediaQuery, usePinchZoom, useSwipeNavigation, useScrollToBottom
├── utils/              # formatMessage, parseReferences
└── routes/             # TanStack Router file-based routes
```

---

_Built with modern web technologies and AI to make medication information more accessible and reliable._
