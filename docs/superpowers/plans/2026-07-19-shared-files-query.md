# Shared Files Query Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize the 10-file and 100-file media requests in one parameterized query hook without changing either consumer's payload size or UI.

**Architecture:** Add pure key/URL builders and `useFiles({ limit })` in a dedicated query module. Both UI consumers replace component-level `useQuery` and direct API imports with the shared hook.

**Tech Stack:** TypeScript 6, React 19, TanStack Query 5, Bun test, Expo 56.

## Global Constraints

- Preserve limits of 10 and 100.
- Keep distinct cache entries for different limits.
- Preserve the empty-array fallback and loading state.
- Do not change upload or media-selection behavior.
- Run full verification after implementation.

---

### Task 1: Add tested files-query options

**Files:**
- Create: `src/features/files/query-options.ts`
- Create: `src/features/files/query-options.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { filesQueryKey, filesRequestUrl } from './query-options';

describe('files query options', () => {
  test('uses the limit in a stable query key', () => {
    expect(filesQueryKey(10)).toEqual(['files', { limit: 10 }]);
    expect(filesQueryKey(100)).not.toEqual(filesQueryKey(10));
  });

  test('uses the limit in the files request URL', () => {
    expect(filesRequestUrl('/files', 100)).toBe('/files?limit=100');
  });
});
```

- [ ] **Step 2: Verify red**

Run `bun test src/features/files/query-options.test.ts`; expect failure because the module is absent.

- [ ] **Step 3: Implement minimal helpers**

```ts
export function filesQueryKey(limit: number) {
  return ['files', { limit }] as const;
}

export function filesRequestUrl(baseUrl: string, limit: number) {
  return `${baseUrl}?${new URLSearchParams({ limit: String(limit) }).toString()}`;
}
```

- [ ] **Step 4: Verify green**

Run the focused test; expect 2 pass, 0 fail.

### Task 2: Centralize files fetching

**Files:**
- Create: `src/hooks/queries/use-files.ts`
- Modify: `src/components/sheets/CreateCapsuleSheet.tsx`
- Modify: `src/components/sheets/SelectFromMediaModal.tsx`

- [ ] **Step 1: Implement `useFiles`**

```ts
import { useQuery } from '@tanstack/react-query';
import { get } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { filesQueryKey, filesRequestUrl } from '@/features/files/query-options';

interface FilesResponse<T> {
  docs?: T[];
}

export function useFiles<T = unknown>(params: { limit: number }) {
  return useQuery({
    queryKey: filesQueryKey(params.limit),
    queryFn: () => get<FilesResponse<T>>(filesRequestUrl(endpoint.files, params.limit))
      .then((response) => response.data?.docs ?? []),
    staleTime: 60_000,
  });
}
```

- [ ] **Step 2: Replace both component-level queries**

Use `useFiles({ limit: 10 })` in capsule creation and `useFiles<MediaFileItem>({ limit: 100 })` in media selection. Remove `useQuery`, `get`, and `endpoint` imports from both files.

- [ ] **Step 3: Verify the checkpoint**

Run the focused test, `bun run verify`, `git diff --check`, and inspect only the helper, test, hook, and two consumer changes.
