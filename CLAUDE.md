# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MedaBot is an AI-powered medicine identification and information system. It identifies medicines from photos, retrieves official patient leaflets from Portugal's INFARMED regulatory database, and enables natural language Q&A over the leaflet content using RAG.

## Commands

- `npm run dev` — Start dev server (Vite)
- `npm run build` — Production build (copies PDF worker + Vite build)
- `npm start` — Start production server (`node .output/server/index.mjs`)
- No test framework is configured

## Environment

Requires `OPENAI_API_KEY` in `.envrc` (loaded via direnv). Copy from `.envrc.example`.

## Tech Stack

- **Framework**: TanStack Start (RC) + TanStack Router (full-stack React with SSR)
- **Build**: Vite + `tanstackStart` plugin + Nitro (configured in `vite.config.ts`)
- **Styling**: Tailwind CSS 4
- **AI**: OpenAI SDK directly (Vision for identification, Embeddings + Chat for RAG)
- **PDF Processing**: `pdf-parse` for text extraction
- **Web Scraping**: Playwright (headless Chromium for INFARMED)
- **Validation**: Zod schemas
- **Deployment**: Fly.io via Docker (node:20-slim, port 3000, Madrid region)

## Architecture

### Processing Pipeline (5 steps)

1. **Identify** (`app/core/identify.ts`) — OpenAI Vision API analyzes medicine photo, returns structured data (name, brand, active substance, dosage) validated with Zod
2. **Fetch PDF** (`app/core/regulatoryPdf.ts`) — Playwright automates INFARMED website to find and download the official patient leaflet PDF, using Levenshtein distance for fuzzy name matching
3. **Process** (`app/core/leafletProcessor.ts`) — `pdf-parse` extracts text, custom splitter chunks it with paragraph-aware boundaries, OpenAI embeddings stored in memory
4. **Query** (`app/core/leafletProcessor.ts`) — Cosine similarity search finds top-k relevant chunks, OpenAI Chat API generates answers constrained to leaflet content with page references
5. **Chat UI** (`app/components/Chat.tsx`) — Streaming-style chat interface with source attribution

### Server-Client Boundary

Server functions live in `app/server/` and use TanStack Start's `createServerFn` with `.inputValidator()` for input validation. Each wraps a core function:
- `performIdentify` → `identify`
- `fetchRegulatoryPdf` → `regulatoryPdf`
- `processLeaflet` / `queryLeaflet` → `leafletProcessor`

### UI Architecture

- `app/components/App.tsx` — Main state machine orchestrating the pipeline screens
- Responsive layouts: `DesktopLayout`, `MobileLayout`, `TabLayout` in `app/components/layouts/`
- `app/context/PDFContext.tsx` — React Context for PDF viewer state
- `app/hooks/useMediaQuery.ts` — Breakpoint detection for responsive rendering
- Routes defined in `app/routes/` using TanStack Router (route tree auto-generated in `app/routeTree.gen.ts`)
- Router exported as `getRouter()` from `app/router.tsx`; root route uses `shellComponent` for the HTML document wrapper

### Key Patterns

- All AI/scraping logic runs server-side only via server functions
- RAG vector store is in-memory, not persisted
- The app is Portuguese-focused (INFARMED database, Portuguese prompts/responses)
- PDF.js worker is copied to `public/` at build time via `scripts/copy-pdf-worker.js`
- Playwright is marked as external in `vite.config.ts` to prevent bundling issues
