import { useMutation } from '@tanstack/react-query';
import { post } from '@/api/mutations';
import { establishSession } from '@/features/auth/session-coordinator';
import {
  resendRegistrationCode,
  resendRegistrationLink,
  verifyRegistrationEmail,
  type ResendRegistrationCodeResult,
} from '@/features/auth/registration-email-contract';

export type { ResendRegistrationCodeResult };

export function useVerifyRegistrationEmail(options?: { email?: string; type?: 'verify' | 'reset' }) {
  return useMutation({
    mutationFn: (token: string) =>
      verifyRegistrationEmail(token, { request: post, establishSession }, options),
  });
}

export function useResendRegistrationCode() {
  return useMutation({
    mutationFn: (email: string): Promise<ResendRegistrationCodeResult> =>
      resendRegistrationCode(email, { request: post }),
  });
}

export function useResendRegistrationLink() {
  return useMutation({
    mutationFn: (email: string) => resendRegistrationLink(email, { request: post }),
  });
}
