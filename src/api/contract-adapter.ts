import type { ApiError, ApiResponse } from './interface';
import type { IAuth, IUser } from '@/types';

export type AuthCompletion =
  | { kind: 'session'; credentials: IAuth; user: IUser }
  | { kind: 'two-factor-required'; token: string }
  | { kind: 'verification-required'; email: string }
  | { kind: 'invalid' };

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function normalizeApiResponse<T>(payload: unknown): ApiResponse<T> {
  const source = record(payload);
  if (!source) {
    return {
      data: payload as T,
      message: '',
      success: true,
    };
  }
  return {
    ...source,
    message: text(source.message) || '',
    success: typeof source.success === 'boolean' ? source.success : true,
  } as ApiResponse<T>;
}

export function normalizeAuthCompletion(payload: unknown): AuthCompletion {
  const outer = record(payload);
  const domain = record(outer?.data) || outer;
  if (!domain) return { kind: 'invalid' };

  if (domain.requires_2fa === true) {
    const token = text(domain.two_fa_token);
    return token ? { kind: 'two-factor-required', token } : { kind: 'invalid' };
  }

  if (domain.requires_verification === true) {
    const email = text(domain.email);
    return email ? { kind: 'verification-required', email } : { kind: 'invalid' };
  }

  const nestedSession = record(domain.session);
  const session = nestedSession || domain;
  const accessToken = text(session.access_token);
  const refreshToken = text(session.refresh_token);
  const accessExpiresAt =
    text(session.access_expires_at) || text(session.expires_at);
  const refreshExpiresAt = text(session.refresh_expires_at);
  const user = record(session.user) || record(domain.user);

  if (!accessToken || !refreshToken || !accessExpiresAt || !refreshExpiresAt || !user) {
    return { kind: 'invalid' };
  }

  const onboardingStatus =
    text(session.onboarding_status) || text(domain.onboarding_status);

  return {
    kind: 'session',
    credentials: {
      access_token: accessToken,
      refresh_token: refreshToken,
      access_expires_at: accessExpiresAt,
      expires_at: accessExpiresAt,
      refresh_expires_at: refreshExpiresAt,
      ...(onboardingStatus ? { onboarding_status: onboardingStatus } : {}),
    },
    user: user as unknown as IUser,
  };
}

export function normalizeApiError(
  payload: unknown,
  httpStatus?: number,
  fallbackMessage = 'Something went wrong',
): ApiError {
  const source = record(payload) || {};
  const status = typeof source.status === 'number' ? source.status : httpStatus;
  return {
    ...source,
    message: text(source.message) || fallbackMessage,
    status,
    httpStatus: httpStatus ?? status,
  } as ApiError;
}
