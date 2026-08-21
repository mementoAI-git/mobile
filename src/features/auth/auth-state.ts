import type { StateCreator } from 'zustand';
import type { IAuth, IUser } from '@/types';
import { storageKeys } from '@/constants/storage-keys';
import type { SessionPhase } from './session-types';

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
  beginAuthentication: () => void;
  commitSession: (auth: IAuth, user: IUser) => void;
  updateCredentials: (auth: IAuth) => void;
  updateUser: (user: IUser) => void;
  beginTermination: () => void;
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

    beginAuthentication: () => set({ phase: 'authenticating', hydrated: true }),
    commitSession: (token, user) => set({
      token,
      user,
      phase: 'authenticated',
      hydrated: true,
    }),
    updateCredentials: (token) => set({ token }),
    updateUser: (user) => set((state) => ({
      user,
      phase: state.token ? 'authenticated' : state.phase,
      hydrated: true,
    })),
    beginTermination: () => set({
      token: null,
      user: null,
      phase: 'terminating',
      hydrated: true,
    }),
    finishAnonymous: () => set({
      token: null,
      user: null,
      phase: 'anonymous',
      hydrated: true,
    }),

    hydrateCredentials: async () => {
      try {
        const raw = await storage.getItem(storageKeys.auth);
        const token = raw ? (JSON.parse(raw) as IAuth) : null;
        if (!token?.access_token || !token?.refresh_token) {
          get().finishAnonymous();
          return;
        }
        set({ token, user: null, phase: 'authenticating', hydrated: true });
      } catch {
        get().finishAnonymous();
      }
    },

    setAuth: async (token) => {
      await storage.setItem(storageKeys.auth, JSON.stringify(token));
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
          storage.deleteItem(storageKeys.auth),
          storage.deleteItem(storageKeys.syncedPushToken),
        ]);
      } finally {
        get().finishAnonymous();
      }
    },
    hydrate: async () => get().hydrateCredentials(),
  });
}
