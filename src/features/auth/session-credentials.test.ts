import { describe, expect, test } from 'bun:test';
import {
  deleteSessionCredentials,
  persistSessionCredentials,
  readSessionCredentials,
  sanitizeUser,
} from './session-credentials';
import { storageKeys } from '@/constants/storage-keys';
import type { IAuth, IUser } from '@/types';

function createMemoryStorage(initial: Record<string, string> = {}) {
  const store = { ...initial };
  return {
    store,
    getItem: async (key: string) => store[key] ?? null,
    setItem: async (key: string, value: string) => {
      store[key] = value;
    },
    deleteItem: async (key: string) => {
      delete store[key];
    },
  };
}

const credentials: IAuth = {
  access_token: 'access-token-value',
  refresh_token: 'refresh-token-value',
  access_expires_at: '2026-09-01T00:00:00.000Z',
  expires_at: '2026-09-01T00:00:00.000Z',
  refresh_expires_at: '2026-10-01T00:00:00.000Z',
  onboarding_status: 'completed',
};

describe('session credentials persistence', () => {
  test('stores access and refresh tokens on separate keys', async () => {
    const storage = createMemoryStorage();
    await persistSessionCredentials(credentials, storage);

    expect(storage.store[storageKeys.authAccessToken]).toBe(credentials.access_token);
    expect(storage.store[storageKeys.authRefreshToken]).toBe(credentials.refresh_token);
    expect(storage.store[storageKeys.auth]).not.toContain('access-token-value');
    expect(await readSessionCredentials(storage)).toEqual(credentials);
  });

  test('migrates a legacy combined auth blob', async () => {
    const storage = createMemoryStorage({
      [storageKeys.auth]: JSON.stringify(credentials),
    });

    expect(await readSessionCredentials(storage)).toEqual(credentials);
    expect(storage.store[storageKeys.authAccessToken]).toBe(credentials.access_token);
  });

  test('deletes split keys and metadata together', async () => {
    const storage = createMemoryStorage();
    await persistSessionCredentials(credentials, storage);
    await deleteSessionCredentials(storage);
    expect(await readSessionCredentials(storage)).toBeNull();
  });
});

describe('sanitizeUser', () => {
  test('strips secrets before they can be cached', () => {
    const user = {
      email: 'a@b.com',
      first_name: 'A',
      last_name: 'B',
      nickname: 'A',
      gender: '',
      phone_number: '',
      dob: '',
      country: '',
      password: 'secret-password',
      onboarded: true,
      onboarding_status: 'completed',
      providers: [],
      preferences: {},
      context: { self_description: '', current_priority: '', join_reasons: [] },
      verified: true,
      private_key: 'pk',
      public_key: 'pub',
      two_factor: { secret: 'totp-secret', enabled: true },
      picture: '',
      last_seen: '',
      streak: 0,
      newsletter_subscriber: false,
      created_at: '',
    } as IUser;

    expect(sanitizeUser(user)).toMatchObject({
      password: '',
      private_key: '',
      public_key: 'pub',
      two_factor: { enabled: true, secret: '' },
    });
    expect(sanitizeUser({ email: 'a@b.com' })).toEqual({ email: 'a@b.com' });
  });
});
