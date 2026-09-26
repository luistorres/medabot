# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

MedaBot identifies medicines from photos, retrieves official patient leaflets from Portugal's INFARMED database, and answers questions using the full leaflet text.

## Commands

- `npm run dev` — Start dev server (Vite)
- `npm run build` — Production build (copies PDF worker + Vite build)
- `npm start` — Start production server (`node .output/server/index.mjs`)
- `npm run test:unit` — Run the unit checks
- `npm run test:smoke` — Check the local database schema
- `npx tsc --noEmit` — Typecheck

## Environment

Requires `OPENAI_API_KEY` in `.envrc` (loaded via direnv). Copy from `.envrc.example`.

## Tech Stack

- **Framework**: TanStack Start (RC) + TanStack Router (full-stack React with SSR)
- **Build**: Vite + `tanstackStart` plugin + Nitro (configured in `vite.config.ts`)
- **Styling**: Tailwind CSS 4
- **AI**: OpenAI SDK directly (GPT-6 Luna for identification and small tasks; GPT-6 Sol for leaflet answers and summaries)
- **PDF Processing**: `pdf-parse` for text extraction
- **Web Scraping**: Playwright (headless Chromium)
- **Validation**: Zod schemas
- **Deployment**: Fly.io via Docker (mcr.microsoft.com/playwright:v1.60.0-noble base / Node 24, port 3000, Paris/cdg region). The image tag must match the locked playwright version (enforced by a CI guard in fly-deploy.yml).

## Architecture

### Processing Pipeline (5 steps)

1. **Identify** (`app/core/identify.ts`) — OpenAI Vision API analyzes medicine photo, returns structured data (name, brand, active substance, dosage) validated with Zod
2. **Fetch PDF** (`app/core/regulatoryPdf.ts`) — Playwright automates authority website to find and download the official patient leaflet PDF, using Levenshtein distance for fuzzy name matching
3. **Process** (`app/core/leafletStore.ts`) — `pdf-parse` extracts page text, preserving page numbers; a bounded in-memory cache stores parsed leaflets by PDF hash
4. **Query** (`app/core/leafletProcessor.ts`) — OpenAI Chat receives the page-tagged leaflet and conversation history; the server validates citations and source quotes
5. **Chat UI** (`app/components/Chat.tsx`) — Chat interface with page references and source highlighting

### Server-Client Boundary

Server functions live in `app/server/` and use TanStack Start's `createServerFn` with `.inputValidator()` for input validation. Each wraps a core function:

- `performIdentify` → `identifyMedicine`
- `fetchRegulatoryPdf` → `regulatoryPdf`
- `processLeafletPdf` → `leafletStore`
- `queryLeafletPdf` → `leafletProcessor`

### UI Architecture

- `app/components/App.tsx` — Main state machine orchestrating the pipeline screens
- Responsive layouts: `DesktopLayout`, `MobileLayout`, `TabLayout` in `app/components/layouts/`
- `app/context/PDFContext.tsx` — React Context for PDF viewer state
- `app/hooks/useMediaQuery.ts` — Breakpoint detection for responsive rendering
- Routes defined in `app/routes/` using TanStack Router (route tree auto-generated in `app/routeTree.gen.ts`)
- Router exported as `getRouter()` from `app/router.tsx`; root route uses `shellComponent` for the HTML document wrapper

### Key Patterns

- All AI/scraping logic runs server-side only via server functions
- Parsed leaflets are cached in memory; there is no vector store or embeddings step
- The app is Portuguese-focused (INFARMED database, Portuguese prompts/responses)
- PDF.js worker is copied to `public/` at build time via `scripts/copy-pdf-worker.js`
- Playwright is marked as external in `vite.config.ts` to prevent bundling issues
