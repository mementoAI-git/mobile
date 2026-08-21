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

  test('clears the synchronization marker through every auth clearing path', async () => {
    const state = await Bun.file(new URL('../auth/auth-state.ts', import.meta.url)).text();
    const coordinator = await Bun.file(new URL('../auth/session-coordinator.ts', import.meta.url)).text();

    expect(state).toContain('storage.deleteItem(storageKeys.syncedPushToken)');
    expect(coordinator).toContain('secureStorage.deleteItem(storageKeys.syncedPushToken)');
  });
});
