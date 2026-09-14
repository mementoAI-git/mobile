import { useMutation } from '@tanstack/react-query';
import endpoint from '@/api/endpoint';
import { post } from '@/api/mutations';
import { completeAuthResponse } from '@/features/auth/auth-completion';
import { establishSession } from '@/features/auth/session-coordinator';

export type ResendRegistrationCodeResult =
  | { kind: 'sent'; email: string }
  | { kind: 'unsupported'; reason: string };

export function useVerifyRegistrationEmail() {
  return useMutation({
    mutationFn: async (token: string) => {
      const response = await post<unknown>(
        endpoint.verifyEmail,
        { token },
        { skipAuth: true },
      );
      return completeAuthResponse(response, establishSession);
    },
  });
}

export function useResendRegistrationCode() {
  return useMutation({
    mutationFn: async (email: string): Promise<ResendRegistrationCodeResult> => {
      const response = await post<{ email?: string }>(
        endpoint.resendVerification,
        { email, type: 'verify' },
        { skipAuth: true },
      );
      return { kind: 'sent', email: response.data?.email ?? email };
    },
  });
}
