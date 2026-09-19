import { describe, expect, mock, test } from 'bun:test';
import endpoint from '@/api/endpoint';
import {
  resendRegistrationCode,
  resendRegistrationLink,
  verifyRegistrationEmail,
} from '@/features/auth/registration-email-contract';

describe('registration email verification adapter', () => {
  test('verifies six-digit OTP against backend endpoint and establishes session', async () => {
    const request = mock(async (url: string, body: unknown) => {
      expect(url).toBe(endpoint.verifyEmail);
      expect(body).toEqual({ token: '123456', email: 'jane@memento.test' });
      return {
        data: {
          access_token: 'valid.jwt.token',
          refresh_token: 'valid.refresh.token',
          access_expires_at: '2026-12-31T23:59:59Z',
          refresh_expires_at: '2027-12-31T23:59:59Z',
          user: {
            _id: 'user_1',
            email: 'jane@memento.test',
            first_name: 'Jane',
            onboarding_status: 'completed',
          },
        },
        success: true,
        status: 200,
      };
    });
    const establishSession = mock(async () => undefined);

    const result = await verifyRegistrationEmail(
      '123456',
      { request, establishSession },
      { email: 'jane@memento.test' },
    );

    expect(result.delivery).toBe('code');
    expect(result.kind).toBe('session');
    expect(request).toHaveBeenCalledTimes(1);
    expect(establishSession).toHaveBeenCalledTimes(1);
  });

  test('resends six-digit OTP with delivery code', async () => {
    const request = mock(async (url: string, body: unknown) => {
      expect(url).toBe(endpoint.resendVerificationLink);
      expect(body).toEqual({ email: 'jane@memento.test', type: 'verify', delivery: 'code' });
      return { data: { email: 'jane@memento.test', delivery: 'code' }, success: true, status: 200 };
    });

    const result = await resendRegistrationCode('jane@memento.test', { request });

    expect(result).toEqual({
      kind: 'sent',
      delivery: 'code',
      email: 'jane@memento.test',
    });
    expect(request).toHaveBeenCalledTimes(1);
  });

  test('labels the resend link operation explicitly as link delivery', async () => {
    const request = mock(async (url: string, body: unknown) => {
      expect(url).toBe(endpoint.resendVerificationLink);
      expect(body).toEqual({ email: 'jane@memento.test', type: 'verify' });
      return { data: { email: 'jane@memento.test' }, success: true, status: 200 };
    });

    const result = await resendRegistrationLink('jane@memento.test', { request });

    expect(result).toEqual({
      kind: 'sent',
      delivery: 'link',
      email: 'jane@memento.test',
    });
  });
});
