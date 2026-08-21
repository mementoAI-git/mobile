import { create } from 'zustand';
import { secureStorage } from '@/lib/secure-storage';
import { createAuthState, type AuthState } from '@/features/auth/auth-state';

export { createAuthState } from '@/features/auth/auth-state';

export const useAuthStore = create<AuthState>(createAuthState(secureStorage));
