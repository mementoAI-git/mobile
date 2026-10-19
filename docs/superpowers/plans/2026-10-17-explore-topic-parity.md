# Explore Topic Parity Implementation Plan

**Goal:** Finish mobile parity with the web Explore taxonomy, question cards, and conversation header.

**Architecture:** Keep the existing canonical catalog and bundled category artwork. Replace the overview's obsolete image lookup with shared metadata, map all eleven categories to enrichment dimensions, and reuse the web's deterministic question artwork in lists and conversations. The shared API owns starter selection and gradual personalization; mobile keeps pagination and refreshes after answers. Use the existing select sheet for not-relevant feedback and invalidate prompt queries on success.

**Tech Stack:** Expo Router, React Native, Expo Image, Reanimated, TanStack Query, Bun.

- [x] Add failing tests for canonical enrichment ranking, question artwork/source labels, and feedback request validation.
- [x] Fix overview metadata, labels and rounded topic cards; confirm catalog and category artwork match the web.
- [x] Replace category question cards with web-style artwork, editorial questions, source badges, and feedback options.
- [x] Update the collapsible conversation header with shared artwork and canonical category labels, including direct links. Preserve existing chat actions.
- [x] Run focused tests, lint, typecheck, repository verification and available preview checks.

**Verification:** Catalog and all eleven category image files match the web byte-for-byte. Focused Explore/prompt/header tests passed (39 tests). Full suite: 1,065 passed, one unrelated existing copy failure in `app/(auth)/two-factor.tsx` (`Back to login`). Lint, typecheck, typography, responsive, production readiness, and native dependency checks passed. Browser preview reached login; authenticated and device interaction checks remain unavailable in this session.
