import { describe, expect, test, beforeEach, mock } from 'bun:test';

(globalThis as any).expo = {
  EventEmitter: class {
    addListener() { return { remove: () => {} }; }
    removeListener() {}
    emit() {}
  },
};

mock.module('./client-runtime-metadata', () => ({
  getMementoClientHeaders: () => ({
    'X-Memento-Client': 'ios',
    'X-Memento-Version': '1.0.0',
    'X-Memento-Build': '1',
  }),
}));

mock.module('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: mock(async () => null),
    setItem: mock(async () => {}),
    removeItem: mock(async () => {}),
  },
}));

mock.module('expo-secure-store', () => ({
  getItemAsync: mock(async () => null),
  setItemAsync: mock(async () => {}),
  deleteItemAsync: mock(async () => {}),
  isAvailableAsync: mock(async () => true),
}));

describe('Client Auth Guard', () => {
  beforeEach(async () => {
    const { useAuthStore } = await import('@/store/auth.store');
    useAuthStore.getState().finishAnonymous();
  });

  test('rejects protected requests immediately without sending over network when unauthenticated', async () => {
    const { default: client } = await import('./client');
    const { useAuthStore } = await import('@/store/auth.store');

    expect(useAuthStore.getState().token?.access_token).toBeUndefined();

    let caughtError: any = null;
    try {
      await client.get('/memories?page=1&limit=50');
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeTruthy();
    expect(caughtError.status).toBe(401);
    expect(caughtError.message).toContain('Authentication token required');
  });

  test('does not reject unauthenticated endpoints that specify skipAuth: true', async () => {
    const { default: client } = await import('./client');

    let errorFromGuard = false;
    try {
      await client.post('/auth/login', { email: 'test@example.com', password: 'password' }, { skipAuth: true } as any);
    } catch (err: any) {
      if (err?.message?.includes('Authentication token required')) {
        errorFromGuard = true;
      }
    }

    expect(errorFromGuard).toBe(false);
  });
});
