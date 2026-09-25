import {describe, expect, mock, test} from 'bun:test';
import {storageKeys} from '@/constants/storage-keys';
import type {IUser} from '@/types';
import {reconcileOnboardingSkipMarker} from './onboarding-skip-retry';

function memoryStorage(initial?: string) {
  const values = new Map<string, string>();
  if (initial) values.set(storageKeys.pendingOnboardingSkip, initial);
  return {
    values,
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      values.set(key, value);
    },
    deleteItem: async (key: string) => {
      values.delete(key);
    },
  };
}

function user(status: IUser['onboarding_status'] = 'never') {
  return {_id: 'user-1', onboarding_status: status} as IUser;
}

describe('pending onboarding skip reconciliation', () => {
  test('retries the matching user marker and clears it after success', async () => {
    const storage = memoryStorage(
      JSON.stringify({userId: 'user-1', createdAt: new Date().toISOString()}),
    );
    const submitSkip = mock(async () => ({}));

    await reconcileOnboardingSkipMarker(user(), storage, submitSkip);

    expect(submitSkip).toHaveBeenCalledTimes(1);
    expect(storage.values.has(storageKeys.pendingOnboardingSkip)).toBe(false);
  });

  test('retains the marker after a transient retry failure', async () => {
    const storage = memoryStorage(
      JSON.stringify({userId: 'user-1', createdAt: new Date().toISOString()}),
    );

    await reconcileOnboardingSkipMarker(user(), storage, async () => {
        throw new Error('offline');
    });

    expect(storage.values.has(storageKeys.pendingOnboardingSkip)).toBe(true);
  });

  test('clears markers for another account without submitting', async () => {
    const storage = memoryStorage(
      JSON.stringify({userId: 'other-user', createdAt: new Date().toISOString()}),
    );
    const submitSkip = mock(async () => ({}));

    await reconcileOnboardingSkipMarker(user(), storage, submitSkip);

    expect(submitSkip).not.toHaveBeenCalled();
    expect(storage.values.has(storageKeys.pendingOnboardingSkip)).toBe(false);
  });

  test('clears a stale marker when onboarding is already terminal', async () => {
    const storage = memoryStorage('true');
    const submitSkip = mock(async () => ({}));

    await reconcileOnboardingSkipMarker(user('completed'), storage, submitSkip);

    expect(submitSkip).not.toHaveBeenCalled();
    expect(storage.values.has(storageKeys.pendingOnboardingSkip)).toBe(false);
  });
});