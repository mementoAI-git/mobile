import endpoint from '@/api/endpoint';
import type { ApiResponse } from '@/api/interface';
import { completeAuthResponse } from './auth-completion';
import type { AuthCompletion } from '@/api/contract-adapter';
import type { IAuth, IUser } from '@/types';

export interface UnsupportedRegistrationEmailCapability {
  kind: 'unsupported';
  capability: 'code-verification' | 'code-resend';
  requestedDelivery: 'code';
  supportedDelivery: 'link';
  reason: string;
}

export type VerifyRegistrationEmailResult =
  | (AuthCompletion & { delivery: 'link' })
  | UnsupportedRegistrationEmailCapability;

export type ResendRegistrationCodeResult =
  UnsupportedRegistrationEmailCapability;

export interface RegistrationLinkSentResult {
  kind: 'sent';
  delivery: 'link';
  email: string;
}

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

export async function verifyRegistrationEmail(
  token: string,
  dependencies: VerificationDependencies,
): Promise<VerifyRegistrationEmailResult> {
  const value = token.trim();
  if (/^\d{6}$/.test(value)) {
    return {
      kind: 'unsupported',
      capability: 'code-verification',
      requestedDelivery: 'code',
      supportedDelivery: 'link',
      reason: 'The deployed API verifies email links, not six-digit codes.',
    };
  }

  const response = await dependencies.request(
    endpoint.verifyEmail,
    { token: value },
    { skipAuth: true },
  );
  const completion = await completeAuthResponse(
    response,
    dependencies.establishSession,
  );
  return { ...completion, delivery: 'link' };
}

export async function resendRegistrationCode(
  _email: string,
  _dependencies: ResendDependencies,
): Promise<ResendRegistrationCodeResult> {
  return {
    kind: 'unsupported',
    capability: 'code-resend',
    requestedDelivery: 'code',
    supportedDelivery: 'link',
    reason: 'The deployed API can resend a verification link, not a six-digit code.',
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
