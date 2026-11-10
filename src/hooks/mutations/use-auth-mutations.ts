import { useMutation } from '@tanstack/react-query';
import { post, del } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import type { IAuth, IUser } from '@/types';
import { establishSession, terminateSession } from '@/features/auth/session-coordinator';
import type { DeleteAccountPayload } from '@/features/account-deletion/deletion';
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
    mutationFn: (payload: { token: string; password: string; email?: string }) =>
      post(endpoint.setPassword, payload, { skipAuth: true }),
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      const runCleanup = async () => {
        const cleanupTasks: Promise<unknown>[] = [];

        try {
          const { disableCurrentPushDevice } = await import(
            '@/features/notifications/push-device-runtime'
          );
          cleanupTasks.push(disableCurrentPushDevice().catch(() => {}));
        } catch {}

        try {
          const { authService } = await import('@/api/auth-service');
          cleanupTasks.push(authService.logout().catch(() => {}));
        } catch {}

        await Promise.allSettled(cleanupTasks);
      };

      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2000));
      await Promise.race([runCleanup(), timeoutPromise]);
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
    // Reason, details and export preference go in the body; servers that don't read them ignore them.
    mutationFn: (payload?: DeleteAccountPayload) =>
      del(endpoint.deleteAccount, payload ? { data: payload } : undefined),
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
