# MedaBot Impeccable Redesign — Tasks

Spec: `docs/superpowers/specs/2026-05-27-medabot-impeccable-redesign.md`
Mode: autonomous (gates auto-cleared, never merge, one PR per task, branch off `main`).

Current: DONE — all 4 PRs open

- [x] **Task 1 — Visual identity / design system**
  - Branch: `lt/design-identity` (from `main`)
  - Surface: `app/index.css`, `app/routes/__root.tsx`, `app/components/ui/{Button,Chip,Card}.tsx`, `app/components/LandingPage.tsx`
  - Done when: Warm & Humane tokens in place, fonts loaded, glass/mesh/float removed, primitives + landing reskinned, `tsc` + `build` green.
  - **PR:** https://github.com/luistorres/medabot/pull/13
  - **Completed:** 2026-05-27
  - Status: done (tsc + build green)

- [ ] **Task 2 — Make trust visible + citation accuracy**
  - Branch: `lt/trust-visible` (from `main`)
  - Surface: `app/core/leafletProcessor.ts`, `app/server/queryLeaflet.ts`, `app/components/Chat.tsx`, `app/components/MedicineInfoPanel.tsx`, new `scripts/test-page-mapping.ts`
  - Done when: real page mapping + test passing, source chips/provenance/disclaimer/honest-empty in UI, `tsc` + `build` green.
  - **PR:** https://github.com/luistorres/medabot/pull/14
  - **Completed:** 2026-05-27
  - Status: done (tsc + build + 7-test green; 3 Codex findings fixed)

- [ ] **Task 3 — Navigation & flow consistency**
  - Branch: `lt/navigation-flow` (from `main`)
  - Surface: `app/components/App.tsx`, `DisambiguationCard.tsx`, `ManualMedicineForm.tsx`, `Camera.tsx`, `MedicineInfoPanel.tsx`, `ui/FloatingBackButton.tsx`, `context/PDFContext.tsx`
  - Done when: disambiguation carries context, back-to-chat persistent, no dead-ends, honest labels, `tsc` + `build` green.
  - **PR:** https://github.com/luistorres/medabot/pull/15
  - **Completed:** 2026-05-27
  - Status: done (tsc + build green; 3 Codex findings fixed)

- [ ] **Task 4 — States & microcopy hardening**
  - Branch: `lt/states-microcopy` (from `main`)
  - Surface: `app/components/ProcessingScreen.tsx`, `App.tsx`, `Chat.tsx`, `ManualMedicineForm.tsx`, `SearchScreen.tsx`
  - Done when: contextual error/loading/empty states, blur validation, clearer pt-PT microcopy, `tsc` + `build` green.
  - **PR:** https://github.com/luistorres/medabot/pull/16
  - **Completed:** 2026-05-27
  - Status: done (tsc + build green; 3 Codex findings fixed)
