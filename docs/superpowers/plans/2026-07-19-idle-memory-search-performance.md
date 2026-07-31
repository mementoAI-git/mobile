# Idle Memory Search Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent the memory-search sheet from requesting a stories page until the user has entered a non-empty debounced query, without changing normal stories-feed behavior.

**Architecture:** Extract the query enablement decision into a small pure helper colocated with the memories query hook. `useStories` will accept an optional `enabled` setting that defaults to `true`; the search sheet will pass `false` for an empty debounced query. A focused unit test will lock down both the default feed behavior and the search-specific disabled behavior.

**Tech Stack:** TypeScript 6, React 19, TanStack Query 5, Bun test, Expo 56.

## Global Constraints

- Preserve existing stories-feed behavior and query keys.
- Preserve the search sheet's 300 ms debounce.
- An empty or whitespace-only search must issue no stories request.
- Run the full repository verification after the change.
- Do not perform design-rule cleanup in this task.

---

### Task 1: Add explicit stories-query enablement

**Files:**
- Modify: `src/hooks/queries/use-memories.ts`
- Modify: `src/components/sheets/SearchMemorySheet.tsx`
- Create: `src/features/memories/query-options.test.ts`

**Interfaces:**
- Produces: `shouldEnableStoriesQuery(enabled?: boolean): boolean`
- Extends: `useStories(params?, options?: { enabled?: boolean })`
- Consumes: `debouncedQuery` from `SearchMemorySheet`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, test } from 'bun:test';
import { shouldEnableStoriesQuery } from '@/hooks/queries/use-memories';

describe('stories query enablement', () => {
  test('keeps ordinary stories feeds enabled by default', () => {
    expect(shouldEnableStoriesQuery()).toBe(true);
  });

  test('allows consumers to disable an idle query explicitly', () => {
    expect(shouldEnableStoriesQuery(false)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `bun test src/features/memories/query-options.test.ts`

Expected: FAIL because `shouldEnableStoriesQuery` is not exported.

- [ ] **Step 3: Add the minimal query option**

Add this interface and helper to `src/hooks/queries/use-memories.ts`:

```ts
interface StoriesQueryOptions {
  enabled?: boolean;
}

export function shouldEnableStoriesQuery(enabled?: boolean): boolean {
  return enabled ?? true;
}
```

Update the hook signature and query configuration:

```ts
export function useStories(
  params?: { limit?: number; filter?: string; search?: string },
  options?: StoriesQueryOptions,
) {
  return useInfiniteQuery({
    // existing configuration
    enabled: shouldEnableStoriesQuery(options?.enabled),
  });
}
```

- [ ] **Step 4: Disable only the idle search query**

Update `SearchMemorySheet`:

```ts
const hasSearchQuery = debouncedQuery.trim().length > 0;
const { data: searchData, isFetching } = useStories(
  hasSearchQuery ? { search: debouncedQuery, limit: 20 } : undefined,
  { enabled: hasSearchQuery },
);
```

Use `hasSearchQuery` for result and empty-state derivation so whitespace cannot activate the search path.

- [ ] **Step 5: Run the focused test and verify it passes**

Run: `bun test src/features/memories/query-options.test.ts`

Expected: 2 pass, 0 fail.

- [ ] **Step 6: Run repository verification**

Run: `bun run lint`

Expected: exit code 0.

Run: `bun run typecheck`

Expected: exit code 0.

Run: `bun test`

Expected: all tests pass, including the two new enablement tests.

Run: `bun run check:prod`

Expected: `Production readiness checks passed.`

- [ ] **Step 7: Inspect the final diff**

Run: `git diff --check && git diff -- src/hooks/queries/use-memories.ts src/components/sheets/SearchMemorySheet.tsx src/features/memories/query-options.test.ts`

Expected: no whitespace errors; only the query enablement helper, hook option, search-sheet guard, and focused tests are present.

- [ ] **Step 8: Report the checkpoint**

Report that an unopened/idle search path is now disabled by construction, ordinary stories consumers remain enabled by default, and list every automated check executed. State that no native UI behavior changed and a physical-device smoke test was not required for this hook-level change.
