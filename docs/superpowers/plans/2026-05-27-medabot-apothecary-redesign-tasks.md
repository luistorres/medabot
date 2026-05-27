# Apothecary Redesign — Tasks

Plan: `docs/superpowers/plans/2026-05-27-medabot-apothecary-redesign.md`
Decomposition: **single PR** (user choice). One task; the plan's 8 internal tasks are the sub-steps tracked below.
Branch: `lt/apothecary-redesign` (in-place on main checkout — reference materials are untracked, so no worktree).

Current: Task 1

## Task 1: Implement the full apothecary redesign (single PR)

- [ ] **Branch:** `lt/apothecary-redesign`
- **Worktree:** main checkout (in-place; untracked reference materials)
- **Status:** in_progress

Plan sub-tasks (sequential, one branch):
- [x] Plan Task 1 — Design tokens, fonts, global CSS
- [x] Plan Task 2 — UI primitives
- [x] Plan Task 3 — Landing screen
- [x] Plan Task 4 — Entry-flow screens (Search, ManualForm, Camera, Processing, Disambiguation)
- [x] Plan Task 5 — Chat screen + behaviours
- [x] Plan Task 6 — Medicine info panel
- [x] Plan Task 7 — PDF viewer, layouts, Card cleanup
- [x] Plan Task 8 — App wiring, cross-screen polish, full-flow Playwright verification

Playwright verification (real backend, Ben-U-Ron flow): landing, search, disambiguation (no %), processing (4-step + pulse), chat (serif overview, citations p.3/4/5/9, suggestions, rotating placeholder, user bubble), citation→PDF jump + amber wash + FloatingBackButton, medicine panel (MetaRow, numbered list), PDF viewer (header strip, square nav), desktop 3-col layout — ALL verified, zero console errors. "Importante saber" correctly omits (overview lacks dose/álcool keywords).

Acceptance: `npx tsc --noEmit` clean, `npm run build` succeeds, full-flow Playwright walkthrough matches the prototype artboards, 3-agent code review converged, PR opened.
