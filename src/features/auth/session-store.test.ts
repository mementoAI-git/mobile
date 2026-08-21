// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { createStore } from 'zustand/vanilla';

const auth = {
  access_token: 'access-1',
  refresh_token: 'refresh-1',
  expires_at: '2026-08-20T10:00:00.000Z',
  refresh_expires_at: '2026-09-20T10:00:00.000Z',
};
const user = {
  _id: 'user-1',
  email: 'me@example.com',
  onboarding_status: 'completed',
};

describe('authoritative auth session store', () => {
  test('publishes credentials and user in one authenticated transition', async () => {
    let module: typeof import('../../store/auth.store') | undefined;
    try {
      module = await import('./auth-state');
    } catch {
      // Expected before the state creator exists.
    }

    expect(module?.createAuthState).toBeFunction();
    const store = createStore(module!.createAuthState(createFakeStorage()));
    store.getState().commitSession(auth as any, user as any);

    expect(store.getState()).toMatchObject({
      phase: 'authenticated',
      token: auth,
      user,
      hydrated: true,
    });
  });

  test('removes runtime identity synchronously when termination begins', async () => {
    const { createAuthState } = await import('./auth-state');
    const store = createStore(createAuthState(createFakeStorage()));
    store.getState().commitSession(auth as any, user as any);

    store.getState().beginTermination();

    expect(store.getState()).toMatchObject({
      phase: 'terminating',
      token: null,
      user: null,
    });
  });

  test('hydrates valid credentials for profile restoration and rejects malformed storage', async () => {
    const { createAuthState } = await import('./auth-state');
    const validStore = createStore(createAuthState(createFakeStorage(JSON.stringify(auth))));
    await validStore.getState().hydrateCredentials();
    expect(validStore.getState()).toMatchObject({
      phase: 'authenticating',
      token: auth,
      user: null,
    });

    const invalidStore = createStore(createAuthState(createFakeStorage('{broken')));
    await invalidStore.getState().hydrateCredentials();
    expect(invalidStore.getState()).toMatchObject({
      phase: 'anonymous',
      token: null,
      user: null,
    });
  });
});

function createFakeStorage(initial: string | null = null) {
  let stored = initial;
  return {
    getItem: async () => stored,
    setItem: async (_key: string, value: string) => { stored = value; },
    deleteItem: async () => { stored = null; },
  };
}
