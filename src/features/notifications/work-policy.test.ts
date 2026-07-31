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
    const store = await Bun.file(new URL('../../store/auth.store.ts', import.meta.url)).text();
    const service = await Bun.file(new URL('../../api/auth-service.ts', import.meta.url)).text();

    expect(store).toContain('secureStorage.deleteItem(storageKeys.syncedPushToken)');
    expect(service).toContain('secureStorage.deleteItem(storageKeys.syncedPushToken)');
  });
});
