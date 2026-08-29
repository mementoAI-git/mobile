// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import {
  normalizeApiError,
  normalizeAuthCompletion,
} from './contract-adapter';

const user = {
  id: 'user-1',
  email: 'hello@memento.test',
  onboarding_status: 'completed',
};

const canonicalSession = {
  access_token: 'canonical-access',
  refresh_token: 'canonical-refresh',
  access_expires_at: '2026-09-01T00:00:00.000Z',
  refresh_expires_at: '2026-10-01T00:00:00.000Z',
  onboarding_status: 'completed',
  user,
};

test('prefers the canonical nested session over conflicting legacy fields', () => {
  expect(
    normalizeAuthCompletion({
      data: {
        access_token: 'legacy-access',
        refresh_token: 'legacy-refresh',
        expires_at: '2020-01-01T00:00:00.000Z',
        refresh_expires_at: '2020-01-02T00:00:00.000Z',
        user: { ...user, id: 'legacy-user' },
        session: canonicalSession,
      },
    }),
  ).toEqual({
    kind: 'session',
    credentials: {
      access_token: 'canonical-access',
      refresh_token: 'canonical-refresh',
      access_expires_at: '2026-09-01T00:00:00.000Z',
      expires_at: '2026-09-01T00:00:00.000Z',
      refresh_expires_at: '2026-10-01T00:00:00.000Z',
      onboarding_status: 'completed',
    },
    user,
  });
});

test('keeps supported legacy sessions working', () => {
  const completion = normalizeAuthCompletion({
    data: {
      access_token: 'legacy-access',
      refresh_token: 'legacy-refresh',
      expires_at: '2026-09-01T00:00:00.000Z',
      refresh_expires_at: '2026-10-01T00:00:00.000Z',
      onboarding_status: 'never',
      user,
    },
  });

  expect(completion.kind).toBe('session');
  expect(completion.credentials.access_token).toBe('legacy-access');
});

test('distinguishes 2FA and verification-only responses from sessions', () => {
  expect(
    normalizeAuthCompletion({ data: { requires_2fa: true, two_fa_token: 'pending' } }),
  ).toEqual({ kind: 'two-factor-required', token: 'pending' });
  expect(
    normalizeAuthCompletion({ data: { requires_verification: true, email: 'new@memento.test' } }),
  ).toEqual({ kind: 'verification-required', email: 'new@memento.test' });
});

describe('structured API errors', () => {
  test('preserves quota details, validation errors, and request identity', () => {
    expect(
      normalizeApiError(
        {
          message: 'Storage limit reached',
          code: 'STORAGE_QUOTA_EXCEEDED',
          details: { limit_bytes: 200 },
          request_id: 'req-1',
          errors: [{ field: 'file', message: 'Too large' }],
          data: { feature: 'storage' },
        },
        402,
      ),
    ).toMatchObject({
      message: 'Storage limit reached',
      code: 'STORAGE_QUOTA_EXCEEDED',
      details: { limit_bytes: 200 },
      request_id: 'req-1',
      errors: [{ field: 'file', message: 'Too large' }],
      data: { feature: 'storage' },
      status: 402,
      httpStatus: 402,
    });
  });
});
