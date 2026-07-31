# Shared Files Query Design

## Goal

Remove duplicated media-file query definitions from UI components while preserving each consumer's existing payload size and visible behavior.

## Scope

This change covers the 10-file recent-media request in capsule creation and the 100-file request in the media-selection sheet. It does not add infinite scrolling, change search behavior, alter upload flows, or redesign either component.

## Architecture

Create `src/hooks/queries/use-files.ts` as the single files-query boundary. It will export pure helpers for building the parameterized query key and endpoint URL, plus `useFiles({ limit })` for React consumers.

Keys will use `['files', { limit }]`, allowing equal requests to share cache entries while preventing the 10-file and 100-file response shapes from colliding. URLs will be generated through `URLSearchParams` from a normalized positive limit.

`CreateCapsuleSheet` will call `useFiles({ limit: 10 })`. `SelectFromMediaModal` will call `useFiles({ limit: 100 })`. Both retain their existing loading and empty-result behavior.

## Data Flow

1. A component requests files with an explicit limit.
2. `useFiles` derives a stable query key and endpoint URL.
3. TanStack Query owns request deduplication, retries, stale time, and caching.
4. Components consume the returned file array without importing API helpers or defining query behavior.

## Error Behavior

The hook will preserve the current empty-array fallback when the API omits `docs`. Existing component loading behavior remains unchanged. Query errors continue through TanStack Query's standard state and retry configuration; this step does not introduce new user-facing error UI.

## Testing

Pure tests will verify that identical limits produce identical keys, different limits cannot collide, and the request URL contains the expected limit. The focused tests will fail before the helper module is implemented.

After implementation, run focused tests, ESLint, strict TypeScript, all Bun tests, production-readiness checks, and a scoped diff review. No native visual behavior changes, so physical-device testing is not required.

## Success Criteria

- No component-level `useQuery` remains in the two media consumers.
- Neither consumer imports `get` or the files endpoint directly.
- The 10-file and 100-file requests retain their existing limits.
- Query keys are stable and parameterized.
- All automated verification passes.
