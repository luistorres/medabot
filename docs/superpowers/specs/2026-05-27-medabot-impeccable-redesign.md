# MedaBot — Impeccable Redesign (PRD / Spec)

_Date: 2026-05-27 · Depth: Heavy · Driven via `flow:flow` (autonomous run)_

## Context

MedaBot identifies a medicine from a photo (or name), fetches the official INFARMED
patient leaflet, and lets the user ask grounded questions over it. A design critique
(`impeccable:critique`) surfaced that the product's **trust thesis** ("every answer comes
from the official document") is undercut by (a) a generic AI-generated visual identity,
(b) sourcing that is claimed but not shown — and citations that point to *estimated*
pages, (c) navigation dead-ends, and (d) thin error/loading/empty states.

This redesign tackles all four in parallel, one PR per workstream. It is design- and
UX-led; the only backend change is making leaflet page citations **accurate**, because an
unverifiable citation is worse than none for a trust product.

Non-negotiable constraints (from `VISION.md`):
- Portuguese-language product; all UI copy and AI output stay in pt-PT.
- "Document comprehension tool, not medical advice" — disclaimer must be visible.
- Disambiguation over assumption — never silently show the wrong leaflet.
- Don't regress the existing pipeline: identify → fetch → process → overview → chat.

## Aesthetic direction: Warm & Humane

Reassuring, human, legible for anxious or elderly patients — "a kind pharmacist
explaining things calmly," not a cold clinical dashboard. This deliberately rejects the
current blue→teal + glassmorphism AI-slop palette.

### Design tokens (canonical — Stream 1 implements in `app/index.css @theme`)

**Typography** (loaded via Google Fonts in `app/routes/__root.tsx`)
- Display / headings: **Fraunces** — a warm, characterful old-style soft-serif (optical
  sizing). Carries trust + humanity.
- Body / UI: **Figtree** — a friendly humanist sans, highly legible at UI sizes.
- Token names stay stable so other streams/branches don't break:
  `--font-sans: "Figtree", system-ui, sans-serif;`
  `--font-display: "Fraunces", Georgia, serif;`

**Color** — warm paper + healing green + human clay accent (replaces cold blue/teal).
Keep the existing token *names* (`--color-primary-*`, `--color-accent-*`,
semantic, surface) and only change their *values*, so branches 2–4 compiled against
`main` keep working.
- `primary` = grounded **herbal green** (health, safety, calm), warm-toned not neon.
  e.g. 500 `#3f8f6e`, 600 `#2f7558`, 700 `#285f49`, with a soft 50 `#eef6f1`.
- `accent` = soft **terracotta / clay** (human warmth, CTAs/highlights).
  e.g. 500 `#d4825b`, 600 `#bf6b45`, 50 `#fbf0e9`.
- `surface` = warm paper: `--color-surface: #fffdf9; --color-surface-secondary: #faf6ef;
  --color-surface-tertiary: #f3ece1;`
- Ink (body text): warm charcoal `#2b2622` (replaces cold `#1e293b`).
- Semantic success/warning/error: keep but warm them slightly.

**Texture & motion** — intentional, not atmospheric AI-slop.
- Remove `.glass` / `.glass-subtle` glassmorphism usage and the cold `bg-mesh-landing`
  gradient mesh. Replace landing background with a warm, soft, organic wash (very subtle
  paper grain is allowed — it suits the aesthetic and is intentional).
- Keep gentle, purposeful motion (fade/slide on load). Drop the decorative `float`.
- Radii: warm/generous — keep current `lg/xl/2xl`, used consistently.
- Shadows: soft, warm-tinted (low-opacity brown), never hard cold grey.

## Workstreams (each = one issue = one branch = one PR off `main`)

### Stream 1 — Visual identity / design system (`lt/design-identity`)
Establish the Warm & Humane tokens and apply them to the primitives and landing.
**Acceptance:**
- `app/index.css @theme` updated with the tokens above; `--font-display` added.
- Fraunces + Figtree loaded in `__root.tsx`; headings use display font.
- `.glass*`, `bg-noise` (cold), `bg-mesh-landing` removed or replaced with warm equivalents;
  no component references a removed utility.
- `ui/Button`, `ui/Chip`, `ui/Card`, `LandingPage` reflect the new identity.
- AI-slop tells gone: no blue/teal, no glassmorphism, no gradient-mesh, no `float`.
- `npx tsc --noEmit` clean; `npm run build` succeeds.

### Stream 2 — Make trust visible + citation accuracy (`lt/trust-visible`)
UI surfacing **and** the real page-number fix, with a test.
**Acceptance:**
- Backend: `leafletProcessor.ts` tracks **real** page boundaries from `pdf-parse` (use
  the per-page render text rather than `Math.ceil(position*totalPages)`); chunks carry an
  accurate `page`. Add a runnable test (tsx script in `scripts/`, matching the existing
  `scripts/e2e-test.ts` pattern — no new framework) asserting page mapping on a fixture.
- UI: every chat answer shows source page chips; a persistent, quiet **"Fonte: folheto
  oficial INFARMED"** provenance line; a visible, non-alarmist **"não substitui
  aconselhamento médico"** disclaimer; the initial overview gets source attribution too;
  honest "não encontro essa informação no folheto" empty-answer state is visually distinct.
- `tsc` clean; `npm run build` succeeds; the new test passes.

### Stream 3 — Navigation & flow consistency (`lt/navigation-flow`)
**Acceptance:**
- "Nenhum destes" on disambiguation carries the typed name/dosage into the manual form
  (pass `initialData`), no context loss.
- "Back to chat" affordance is persistent (no 10s auto-hide), reversible on mobile + desktop.
- Manual form can return directly to landing; camera's misleading "Introduzir manualmente"
  relabelled to its real action; the 3 redundant "Nova pesquisa" entry points reconciled.
- Forward/back is consistent across screens; no dead-ends.
- `tsc` clean; `npm run build` succeeds.

### Stream 4 — States & microcopy hardening (`lt/states-microcopy`)
**Acceptance:**
- Error states are contextual + non-blaming with a next step (distinguish "not found" vs
  "INFARMED unreachable" vs network); processing steps show which step actually failed.
- Chat errors explain and offer retry; `suggestFollowUps` failure is silent-but-graceful (ok).
- Form validation gives feedback on blur, not only submit; helpful empty states.
- pt-PT microcopy reviewed for clarity (`impeccable:clarify` / `impeccable:harden`).
- `tsc` clean; `npm run build` succeeds.

## Verification (per stream, before its PR)
1. `npx tsc --noEmit` — clean.
2. `npm run build` — succeeds.
3. Stream 2 also: `npx tsx scripts/<new-test>.ts` — passes.
4. Manual smoke is not possible unattended; PR body lists what a human should click-check.

## Autonomy notes
- Gates auto-cleared (standing user approval). Never merge; leave PRs open.
- On genuine doubt, consult `/codex-review` and `/cursor-review` and record the outcome.
- Review loops capped low for completion; unresolved items documented in each PR body.
