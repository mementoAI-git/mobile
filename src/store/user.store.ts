import { create } from 'zustand';
import type { IUser } from '@/types';

interface UserState {
  user: IUser | null;
  setUser: (user: IUser) => void;
  clearUser: () => void;
}

/** Compatibility mirror. Auth and routing read useAuthStore.user instead. */
export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
