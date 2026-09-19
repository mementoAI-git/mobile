import endpoint from '@/api/endpoint';
import type { ApiResponse } from '@/api/interface';
import { completeAuthResponse } from './auth-completion';
import type { AuthCompletion } from '@/api/contract-adapter';
import type { IAuth, IUser } from '@/types';

export interface RegistrationCodeSentResult {
  kind: 'sent';
  delivery: 'code' | 'link';
  email: string;
}

export type VerifyRegistrationEmailResult =
  | (AuthCompletion & { delivery: 'link' | 'code' });

export type ResendRegistrationCodeResult = RegistrationCodeSentResult;

export type RegistrationLinkSentResult = RegistrationCodeSentResult;

type VerificationRequest = (
  url: string,
  body: unknown,
  options?: { skipAuth: boolean },
) => Promise<ApiResponse<unknown>>;

interface VerificationDependencies {
  request: VerificationRequest;
  establishSession(credentials: IAuth, user: IUser): Promise<void>;
}

interface ResendDependencies {
  request: VerificationRequest;
}

export interface VerifyRegistrationEmailOptions {
  email?: string;
  type?: 'verify' | 'reset';
}

export async function verifyRegistrationEmail(
  token: string,
  dependencies: VerificationDependencies,
  options?: VerifyRegistrationEmailOptions,
): Promise<VerifyRegistrationEmailResult> {
  const value = token.trim();
  const isCode = /^\d{6}$/.test(value);

  const payload: Record<string, string> = { token: value };
  if (options?.email) {
    payload.email = options.email.trim().toLowerCase();
  }
  if (options?.type) {
    payload.type = options.type;
  }

  const response = await dependencies.request(
    endpoint.verifyEmail,
    payload,
    { skipAuth: true },
  );

  if (
    response.success !== true ||
    (response.status !== undefined && (response.status < 200 || response.status >= 300))
  ) {
    const message =
      (response as any)?.message ||
      (response.data as any)?.message ||
      'Invalid or expired verification code.';
    throw new Error(message);
  }

  if (options?.type === 'reset') {
    return {
      kind: 'redirect',
      delivery: isCode ? 'code' : 'link',
      href: '/(auth)/set-password',
    } as any;
  }

  const completion = await completeAuthResponse(
    response,
    dependencies.establishSession,
  );
  return { ...completion, delivery: isCode ? 'code' : 'link' };
}

export async function resendRegistrationCode(
  email: string,
  dependencies: ResendDependencies,
): Promise<ResendRegistrationCodeResult> {
  const response = await dependencies.request(
    endpoint.resendVerificationLink,
    { email, type: 'verify', delivery: 'code' },
    { skipAuth: true },
  );

  if (
    response.success !== true ||
    (response.status !== undefined &&
      (response.status < 200 || response.status >= 300))
  ) {
    throw new Error('The server did not acknowledge the verification code request.');
  }

  const responseEmail = (response.data as { email?: unknown } | null)?.email;
  return {
    kind: 'sent',
    delivery: 'code',
    email: typeof responseEmail === 'string' ? responseEmail : email,
  };
}

export async function resendRegistrationLink(
  email: string,
  dependencies: ResendDependencies,
): Promise<RegistrationLinkSentResult> {
  const response = await dependencies.request(
    endpoint.resendVerificationLink,
    { email, type: 'verify' },
    { skipAuth: true },
  );
  if (
    response.success !== true ||
    (response.status !== undefined &&
      (response.status < 200 || response.status >= 300))
  ) {
    throw new Error('The server did not acknowledge the verification link request.');
  }
  const responseEmail = (response.data as { email?: unknown } | null)?.email;
  return {
    kind: 'sent',
    delivery: 'link',
    email: typeof responseEmail === 'string' ? responseEmail : email,
  };
}
