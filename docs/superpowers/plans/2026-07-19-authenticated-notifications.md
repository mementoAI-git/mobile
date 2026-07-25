# Authenticated Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Defer notification setup until authentication and skip backend synchronization for an unchanged successfully synced push token.

**Architecture:** Mount a notification manager only inside the authenticated application tree. Keep native listeners stable inside `useNotifications`, move profile synchronization into a mutation hook, and persist/clear a synchronization marker with auth storage.

**Tech Stack:** TypeScript 6, React 19, Expo Notifications 56, TanStack Query 5, Zustand 5, Expo SecureStore, Bun test.

## Global Constraints

- Do not add auth or router dependencies to the notification listener effect.
- Preserve URL normalization and pending-deep-link behavior.
- Store the marker only after a successful backend PUT.
- Remove the marker whenever auth is cleared.
- Preserve Expo Go and simulator safeguards.
- Run full automated verification and provide a physical-device checklist.

---

### Task 1: Add tested notification-work decisions

**Files:**
- Create: `src/features/notifications/work-policy.ts`
- Create: `src/features/notifications/work-policy.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { shouldInitializeNotifications, shouldSyncPushToken } from './work-policy';

describe('notification work policy', () => {
  test('initializes only after authentication is hydrated with a token', () => {
    expect(shouldInitializeNotifications(false, true)).toBe(false);
    expect(shouldInitializeNotifications(true, false)).toBe(false);
    expect(shouldInitializeNotifications(true, true)).toBe(true);
  });

  test('syncs only a non-empty token that differs from the last success', () => {
    expect(shouldSyncPushToken(null, null)).toBe(false);
    expect(shouldSyncPushToken('ExponentPushToken[a]', 'ExponentPushToken[a]')).toBe(false);
    expect(shouldSyncPushToken('ExponentPushToken[b]', 'ExponentPushToken[a]')).toBe(true);
  });
});
```

- [ ] **Step 2: Verify red**

Run the focused test and confirm it fails because `work-policy` is absent.

- [ ] **Step 3: Implement the pure policy**

```ts
export function shouldInitializeNotifications(hydrated: boolean, hasToken: boolean) {
  return hydrated && hasToken;
}

export function shouldSyncPushToken(currentToken: string | null, lastSyncedToken: string | null) {
  return Boolean(currentToken && currentToken !== lastSyncedToken);
}
```

- [ ] **Step 4: Verify green**

Run the focused test; expect 2 pass, 0 fail.

### Task 2: Add authenticated synchronization

**Files:**
- Modify: `src/constants/storage-keys.ts`
- Create: `src/hooks/mutations/use-push-token-mutation.ts`
- Create: `src/components/system/AuthenticatedNotificationManager.tsx`
- Modify: `src/store/auth.store.ts`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Add the storage key**

Add `syncedPushToken: 'memento.synced_push_token'` to `storageKeys`.

- [ ] **Step 2: Add the synchronization mutation**

```ts
export function useSyncPushToken() {
  return useMutation({
    mutationFn: async (token: string) => {
      const lastSyncedToken = await secureStorage.getItem(storageKeys.syncedPushToken);
      if (!shouldSyncPushToken(token, lastSyncedToken)) return { synced: false };
      await put(endpoint.profile, { push_token: token });
      await secureStorage.setItem(storageKeys.syncedPushToken, token);
      return { synced: true };
    },
  });
}
```

- [ ] **Step 3: Add the manager component**

```tsx
export function AuthenticatedNotificationManager() {
  const { expoPushToken } = useNotifications();
  const { mutate: syncPushToken } = useSyncPushToken();

  useEffect(() => {
    if (!expoPushToken) return;
    syncPushToken(expoPushToken, {
      onError: (error) => logger.error('Failed to sync push token', error),
    });
  }, [expoPushToken, syncPushToken]);

  return null;
}
```

- [ ] **Step 4: Mount only for authenticated state**

Remove the unconditional `useNotifications()` call and push-token sync effect from `RootLayout`. Render inside `ToastProvider`:

```tsx
{shouldInitializeNotifications(hydrated, Boolean(token)) ? (
  <AuthenticatedNotificationManager />
) : null}
```

- [ ] **Step 5: Clear the marker with auth**

```ts
clearAuth: async () => {
  try {
    await Promise.all([
      secureStorage.deleteItem(storageKeys.auth),
      secureStorage.deleteItem(storageKeys.syncedPushToken),
    ]);
  } finally {
    set({ token: null });
  }
},
```

- [ ] **Step 6: Run verification**

Run the focused test, `bun run verify`, `git diff --check`, and inspect the notification policy, mutation, manager, auth store, root layout, and storage-key changes.

- [ ] **Step 7: Report native smoke requirements**

List checks for development-build login permission flow, foreground receipt, notification tap navigation, relaunch deduplication, logout/login resynchronization, and Expo Go startup. Do not claim these physical-device checks were executed unless a device was actually available.
