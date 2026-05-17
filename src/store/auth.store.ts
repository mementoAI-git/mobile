import { create } from 'zustand';
import type { IAuth } from '@/types';
import { storageKeys } from '@/constants/storage-keys';
import { secureStorage } from '@/lib/secure-storage';

interface AuthState {
  token: IAuth | null;
  hydrated: boolean;
  setAuth: (auth: IAuth) => Promise<void>;
  clearAuth: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  hydrated: false,

  setAuth: async (auth) => {
    await secureStorage.setItem(storageKeys.auth, JSON.stringify(auth));
    set({ token: auth });
  },

  clearAuth: async () => {
    await secureStorage.deleteItem(storageKeys.auth);
    set({ token: null });
  },

  hydrate: async () => {
    try {
      const raw = await secureStorage.getItem(storageKeys.auth);
      const token = raw ? (JSON.parse(raw) as IAuth) : null;
      set({ token, hydrated: true });
    } catch {
      set({ token: null, hydrated: true });
    }
  },
}));
