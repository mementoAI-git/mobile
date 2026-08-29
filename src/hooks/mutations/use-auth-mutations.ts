import { useMutation } from '@tanstack/react-query';
import { post, del } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import type { IAuth, IUser } from '@/types';
import { establishSession, terminateSession } from '@/features/auth/session-coordinator';
import { completeAuthResponse } from '@/features/auth/auth-completion';

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

export function useLogin() {
  return useMutation({
    mutationFn: (payload: LoginPayload) =>
      post<unknown>(endpoint.login, payload, { skipAuth: true }),
    onSuccess: async (res) => {
      await completeAuthResponse(res, establishSession);
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (payload: RegisterPayload) =>
      post<unknown>(endpoint.register, payload, { skipAuth: true }),
    onSuccess: async (res) => {
      await completeAuthResponse(res, establishSession);
    },
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
      post<unknown>(endpoint.verifyEmail, { token }, { skipAuth: true }),
    onSuccess: async (res) => {
      await completeAuthResponse(res, establishSession);
    },
  });
}

export function useSetPassword() {
  return useMutation({
    mutationFn: (payload: { token: string; password: string }) =>
      post(endpoint.setPassword, payload, { skipAuth: true }),
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      const { authService } = await import('@/api/auth-service');
      await authService.logout();
    },
    onSettled: async () => {
      await terminateSession('logout');
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
  return useMutation({
    mutationFn: () => del(endpoint.deleteAccount),
    onSuccess: async () => {
      await terminateSession('deleted');
    },
  });
}

export function useVerify2FA() {
  return useMutation({
    mutationFn: (payload: { two_fa_token: string; code: string }) =>
      post<unknown>(endpoint.verify2FALogin, payload, { skipAuth: true }),
    onSuccess: async (res) => {
      await completeAuthResponse(res, establishSession);
    },
  });
}

export function useLogoutOtherDevices() {
  return useMutation({
    mutationFn: () => del(endpoint.logoutOther),
  });
}
