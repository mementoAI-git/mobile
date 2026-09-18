// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { createStore } from 'zustand/vanilla';
import { createAuthState } from './auth-state';
import { createUserStoreBridge } from './user-store-bridge';

function createFakeStorage(initial: string | null = null) {
  let stored = initial;
  return {
    getItem: async () => stored,
    setItem: async (_key: string, value: string) => { stored = value; },
    deleteItem: async () => { stored = null; },
  };
}

describe('user store bridge', () => {
  test('delegates getState directly to auth store user', () => {
    const authStore = createStore(createAuthState(createFakeStorage()));
    const bridge = createUserStoreBridge(authStore as any);

    expect(bridge.getState().user).toBeNull();

    authStore.getState().updateUser({
      _id: 'u-1',
      email: 'test@example.com',
      nickname: 'TestUser',
    } as any);

    expect(bridge.getState().user).toEqual({
      _id: 'u-1',
      email: 'test@example.com',
      nickname: 'TestUser',
    } as any);
  });

  test('delegates setUser to auth store updateUser', () => {
    const authStore = createStore(createAuthState(createFakeStorage()));
    const bridge = createUserStoreBridge(authStore as any);

    bridge.getState().setUser({
      _id: 'u-2',
      email: 'user2@example.com',
      first_name: 'Jane',
    } as any);

    expect(authStore.getState().user).toEqual({
      _id: 'u-2',
      email: 'user2@example.com',
      first_name: 'Jane',
    } as any);
    expect(bridge.getState().user).toEqual({
      _id: 'u-2',
      email: 'user2@example.com',
      first_name: 'Jane',
    } as any);
  });
});
