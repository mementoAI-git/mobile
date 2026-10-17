# Explore Web Parity Implementation Plan

**Goal:** Match the current web Explore catalog, artwork, and topic browsing on mobile.

**Architecture:** Bundle the web's generated eleven-category catalog and optimized artwork. Prefer valid API catalog data, resolve legacy category links to canonical slugs, and fetch actual paginated topics from the existing prompt API. Retain mobile components, typography, and haptics. No backend or web changes.

**Tech Stack:** Expo Router, React Native, TanStack Query, Bun tests.

- [x] Test catalog fallback, valid API responses, legacy category aliases, and topic URL/pagination behavior before implementation.
- [x] Copy the approved web catalog and 768px artwork; centralize mobile category metadata around canonical slugs.
- [x] Update Explore and category detail hooks/screens to use the catalog and canonical topic routes. Show unavailable/retry states, use All topics/Answered filters, and load subsequent topic pages.
- [x] Run focused tests, repository verification, and Expo web preview. Report any native or login limitations of browser verification.

**Verification:** `bun run verify` passed (1,039 tests); focused catalog, pagination, and persistence tests passed. All eleven images and the generated catalog match the web source byte-for-byte. Expo web compiled and reached login, where the existing native SecureStore web error prevents authenticated visual verification. Independent code review completed; the identified refresh retry issue was corrected.
