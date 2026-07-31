# Activities Infinite Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Activities screen one React Query-owned infinite pagination flow while preserving the bounded Overview query.

**Architecture:** Add a pure next-page helper and a separate `useInfiniteActivities` hook with a non-colliding query key. Replace the screen's copied page-one data and imperative later-page requests with flattened infinite-query pages and a guarded stable load-more callback.

**Tech Stack:** TypeScript 6, React 19, TanStack Query 5, Bun test, Expo 56.

## Global Constraints

- Keep `useActivities(params)` unchanged for Overview.
- Preserve the Activities screen's visible layout and load-more interaction.
- Do not start a second next-page request while one is active.
- Keep previously loaded pages visible when a later request fails.
- Run full verification before reporting completion.

---

### Task 1: Add tested activity-page derivation

**Files:**
- Create: `src/features/activities/pagination.ts`
- Create: `src/features/activities/pagination.test.ts`

**Interfaces:**
- Produces: `getNextActivitiesPage(lastPage: Pick<ActivitiesResponse, 'hasNextPage' | 'page'>): number | undefined`

- [ ] **Step 1: Write the failing test**

```ts
// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { getNextActivitiesPage } from './pagination';

describe('activities pagination', () => {
  test('returns the next numeric page when more activity exists', () => {
    expect(getNextActivitiesPage({ hasNextPage: true, page: 2 })).toBe(3);
  });

  test('stops pagination after the final page', () => {
    expect(getNextActivitiesPage({ hasNextPage: false, page: 2 })).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test and verify red**

Run: `bun test src/features/activities/pagination.test.ts`

Expected: fail because `./pagination` does not exist.

- [ ] **Step 3: Implement the pure helper**

```ts
export interface ActivitiesPageState {
  hasNextPage: boolean;
  page: number;
}

export function getNextActivitiesPage(lastPage: ActivitiesPageState): number | undefined {
  return lastPage.hasNextPage ? lastPage.page + 1 : undefined;
}
```

- [ ] **Step 4: Run the focused test and verify green**

Run: `bun test src/features/activities/pagination.test.ts`

Expected: 2 pass, 0 fail.

---

### Task 2: Move the Activities screen to an infinite query

**Files:**
- Modify: `src/hooks/queries/use-activities.ts`
- Modify: `app/settings/activities.tsx`

**Interfaces:**
- Produces: `useInfiniteActivities(params?: { limit?: number })`
- Consumes: `getNextActivitiesPage`

- [ ] **Step 1: Add `useInfiniteActivities`**

Add `useInfiniteQuery` to the TanStack import and implement:

```ts
export function useInfiniteActivities(params?: { limit?: number }) {
  const limit = params?.limit ?? 20;
  return useInfiniteQuery({
    queryKey: ['activities', 'infinite', { limit }],
    queryFn: ({ pageParam = 1 }) => {
      const qs = new URLSearchParams({ page: String(pageParam), limit: String(limit) });
      return get<ActivitiesResponse>(`${endpoint.activities}?${qs.toString()}`).then((r) => r.data);
    },
    initialPageParam: 1,
    getNextPageParam: getNextActivitiesPage,
    staleTime: 60_000,
  });
}
```

- [ ] **Step 2: Remove duplicated screen pagination state**

Remove `useState`, `page`, `allDocs`, `loadingMore`, the page-one copy effect, and dynamic API imports. Replace them with:

```ts
const {
  data,
  isLoading,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
} = useInfiniteActivities({ limit: PAGE_SIZE });

const displayDocs = useMemo(
  () => data?.pages.flatMap((activityPage) => activityPage.docs) ?? [],
  [data?.pages],
);
const totalDocs = data?.pages[0]?.totalDocs ?? 0;
```

- [ ] **Step 3: Guard load-more requests**

```ts
const handleLoadMore = useCallback(() => {
  if (!hasNextPage || isFetchingNextPage) return;
  Haptics.selectionAsync();
  void fetchNextPage();
}, [fetchNextPage, hasNextPage, isFetchingNextPage]);
```

Use `hasNextPage` for load-more visibility, `isFetchingNextPage` for its disabled/spinner state, and `displayDocs` directly for rendering.

- [ ] **Step 4: Run the focused test**

Run: `bun test src/features/activities/pagination.test.ts`

Expected: 2 pass, 0 fail.

- [ ] **Step 5: Run full verification**

Run: `bun run verify`

Expected: lint, strict TypeScript, every test, and production-readiness checks pass.

- [ ] **Step 6: Inspect the diff**

Run: `git diff --check` and inspect only the activity helper, test, hook, and screen changes.

- [ ] **Step 7: Report the checkpoint**

Report focused/full test counts, lint/typecheck/production results, removed duplicated work, and whether native smoke testing was required.
