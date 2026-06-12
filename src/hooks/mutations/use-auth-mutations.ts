import { useMutation, useQueryClient } from '@tanstack/react-query';
import { post, del } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { useAuthStore, useUserStore } from '@/store';
import { queryKeys } from '@/constants/query-keys';
import type { IAuth, IUser } from '@/types';

interface LoginPayload {
  email: string;
  password: string;
  remember_for_30_days?: boolean;
}

interface RegisterPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  refresh_expires_at: string;
  user: IUser;
  onboarded?: boolean;
  onboarding_status?: string;
}

interface TwoFARequiredResponse {
  requires_2fa: true;
  two_fa_token: string;
}

type LoginResponse = AuthResponse | TwoFARequiredResponse;

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const setUser = useUserStore((s) => s.setUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LoginPayload) =>
      post<LoginResponse>(endpoint.login, payload, { skipAuth: true }),
    onSuccess: async (res) => {
      const data = res.data as any;
      // 2FA required — caller handles redirect
      if (data.requires_2fa) return;
      const { user, ...auth } = data as AuthResponse;
      await setAuth(auth as IAuth);
      setUser(user);
      queryClient.setQueryData(queryKeys.profile, user);
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (payload: RegisterPayload) =>
      post<AuthResponse>(endpoint.register, payload, { skipAuth: true }),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) =>
      post(endpoint.sendLink, { email, type: 'reset' }, { skipAuth: true }),
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (token: string) =>
      post(endpoint.verifyEmail, { token }, { skipAuth: true }),
  });
}

export function useSetPassword() {
  return useMutation({
    mutationFn: (payload: { token: string; password: string }) =>
      post(endpoint.setPassword, payload, { skipAuth: true }),
  });
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const clearUser = useUserStore((s) => s.clearUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { authService } = await import('@/api/auth-service');
      await authService.logout();
    },
    onSettled: async () => {
      await clearAuth();
      clearUser();
      queryClient.removeQueries();
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: { current_password: string; new_password: string }) =>
      post(endpoint.changePassword, payload),
  });
}

export function useDeleteAccount() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const clearUser = useUserStore((s) => s.clearUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => del(endpoint.deleteAccount),
    onSuccess: async () => {
      await clearAuth();
      clearUser();
      queryClient.removeQueries();
    },
  });
}

export function useVerify2FA() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const setUser = useUserStore((s) => s.setUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { two_fa_token: string; code: string }) =>
      post<AuthResponse>(endpoint.verify2FALogin, payload, { skipAuth: true }),
    onSuccess: async (res) => {
      const { user, ...auth } = res.data;
      await setAuth(auth as IAuth);
      setUser(user);
      queryClient.setQueryData(queryKeys.profile, user);
    },
  });
}
