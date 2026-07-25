# Activities Infinite Pagination Design

## Goal

Replace the Activities screen's split React Query/local-state pagination with one cached infinite query while preserving the Overview screen's existing four-item activity query.

## Scope

This change affects only activity pagination and its tests. It does not alter activity-card visuals, screen copy, haptics, or the Overview query behavior.

## Architecture

The existing `useActivities(params)` hook remains unchanged for bounded consumers such as Overview. A new `useInfiniteActivities({ limit })` hook owns every Activities-screen page through TanStack Query's `useInfiniteQuery`.

The hook will use the existing `queryKeys.activities` prefix with a distinct `infinite` segment and the page size, preventing the infinite cache shape from colliding with the bounded query cache. A pure helper will derive the next page only when the API reports another page.

The Activities screen will flatten `data.pages` with `useMemo`. A stable `useCallback` handler will call `fetchNextPage()` only when another page exists and no next-page request is already running. The current user-triggered load-more interaction and haptic feedback remain unchanged.

## Data Flow

1. The screen calls `useInfiniteActivities({ limit: PAGE_SIZE })`.
2. TanStack Query requests page 1 and stores the paginated response.
3. The screen derives a flat activity list from all cached pages.
4. Load more requests `lastPage.page + 1` only when `lastPage.hasNextPage` is true.
5. Refresh and invalidation operate on query-owned pages rather than duplicated local state.

## Error and Concurrency Behavior

TanStack Query owns request deduplication, retries, and failure state. The load-more callback is guarded by `hasNextPage` and `isFetchingNextPage`, preventing repeated taps from starting duplicate page requests. A failed next-page request leaves previously loaded pages intact and can be retried through the existing interaction.

## Testing

A focused pure-unit test will prove that the next-page helper returns the next numeric page only when `hasNextPage` is true. Existing repository checks will validate hook types and screen integration.

After implementation, run the focused test, ESLint, strict TypeScript, all Bun tests, production-readiness checks, and a diff review. The change does not modify native UI, so a physical-device smoke test is not required; compile-time verification protects the React Query integration.

## Success Criteria

- Page one and later activity pages share one infinite-query cache.
- The Activities screen has no manual API import or duplicated page/list/loading state.
- Overview continues using its existing bounded query.
- Repeated load-more presses cannot start concurrent requests.
- All automated verification passes.
