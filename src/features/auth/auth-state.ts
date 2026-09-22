import type { StateCreator } from 'zustand';
import type { IAuth, IUser } from '@/types';
import { storageKeys } from '@/constants/storage-keys';
import type { SessionPhase } from './session-types';

import type { TerminationReason } from './session-coordinator';
import {
  deleteSessionCredentials,
  persistSessionCredentials,
  readSessionCredentials,
  readSessionUser,
} from './session-credentials';

export interface AuthStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  deleteItem: (key: string) => Promise<void>;
}

export interface AuthState {
  token: IAuth | null;
  user: IUser | null;
  phase: SessionPhase;
  hydrated: boolean;
  terminationReason: TerminationReason | null;
  twoFactorPendingToken: string | null;
  setTwoFactorPendingToken: (token: string | null) => void;
  beginAuthentication: () => void;
  commitSession: (auth: IAuth, user: IUser) => void;
  updateCredentials: (auth: IAuth) => void;
  updateUser: (user: IUser) => void;
  beginTermination: (reason?: TerminationReason) => void;
  finishAnonymous: () => void;
  hydrateCredentials: () => Promise<void>;
  setAuth: (auth: IAuth) => Promise<void>;
  clearAuth: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export function createAuthState(storage: AuthStorage): StateCreator<AuthState> {
  return (set, get) => ({
    token: null,
    user: null,
    phase: 'hydrating',
    hydrated: false,
    terminationReason: null,
    twoFactorPendingToken: null,

    setTwoFactorPendingToken: (twoFactorPendingToken) => set({ twoFactorPendingToken }),
    beginAuthentication: () => set({ phase: 'authenticating', hydrated: true }),
    commitSession: (token, user) => set({
      token,
      user,
      phase: 'authenticated',
      hydrated: true,
      terminationReason: null,
    }),
    updateCredentials: (token) => set({ token }),
    updateUser: (user) => set((state) => ({
      user,
      phase: state.token ? 'authenticated' : state.phase,
      hydrated: true,
    })),
    beginTermination: (reason) => set({
      token: null,
      user: null,
      phase: 'terminating',
      hydrated: true,
      terminationReason: reason || null,
      twoFactorPendingToken: null,
    }),
    finishAnonymous: () => set((state) => ({
      token: null,
      user: null,
      phase: 'anonymous',
      hydrated: true,
      terminationReason: state.terminationReason,
      twoFactorPendingToken: null,
    })),

    hydrateCredentials: async () => {
      try {
        const [token, cachedUser] = await Promise.all([
          readSessionCredentials(storage),
          readSessionUser(storage),
        ]);
        if (!token?.access_token || !token?.refresh_token) {
          get().finishAnonymous();
          return;
        }
        set({
          token,
          user: cachedUser,
          phase: cachedUser ? 'authenticated' : 'authenticating',
          hydrated: true,
        });
      } catch {
        get().finishAnonymous();
      }
    },

    setAuth: async (token) => {
      await persistSessionCredentials(token, storage);
      set((state) => ({
        token,
        phase: state.user ? 'authenticated' : 'authenticating',
        hydrated: true,
      }));
    },
    clearAuth: async () => {
      get().beginTermination();
      try {
        await Promise.all([
          deleteSessionCredentials(storage),
          storage.deleteItem(storageKeys.syncedPushToken),
        ]);
      } finally {
        get().finishAnonymous();
      }
    },
    hydrate: async () => get().hydrateCredentials(),
  });
}
