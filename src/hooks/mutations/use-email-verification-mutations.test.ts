import { describe, expect, mock, test } from 'bun:test';
import endpoint from '@/api/endpoint';
import {
  resendRegistrationCode,
  resendRegistrationLink,
  verifyRegistrationEmail,
} from '@/features/auth/registration-email-contract';

describe('registration email verification adapter', () => {
  test('reports six-digit code verification as unsupported without calling the UUID endpoint', async () => {
    const request = mock(async () => ({ data: {} }));
    const establishSession = mock(async () => undefined);

    const result = await verifyRegistrationEmail(
      '123456',
      { request, establishSession },
    );

    expect(result).toEqual({
      kind: 'unsupported',
      capability: 'code-verification',
      requestedDelivery: 'code',
      supportedDelivery: 'link',
      reason: 'The deployed API verifies email links, not six-digit codes.',
    });
    expect(request).not.toHaveBeenCalled();
    expect(establishSession).not.toHaveBeenCalled();
  });

  test('reports code resend as unsupported without sending a verification link', async () => {
    const request = mock(async () => ({ data: {} }));

    const result = await resendRegistrationCode('jane@memento.test', { request });

    expect(result).toEqual({
      kind: 'unsupported',
      capability: 'code-resend',
      requestedDelivery: 'code',
      supportedDelivery: 'link',
      reason: 'The deployed API can resend a verification link, not a six-digit code.',
    });
    expect(request).not.toHaveBeenCalled();
  });

  test('labels the deployed resend operation explicitly as link delivery', async () => {
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
