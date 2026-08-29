// @ts-nocheck
import { expect, mock, test } from 'bun:test';
import { completeAuthResponse } from './auth-completion';

const session = {
  access_token: 'access',
  refresh_token: 'refresh',
  access_expires_at: '2026-09-01T00:00:00.000Z',
  refresh_expires_at: '2026-10-01T00:00:00.000Z',
  user: { id: 'user-1', email: 'hello@memento.test' },
};

test('establishes only complete session responses', async () => {
  const establish = mock(async () => undefined);

  const completion = await completeAuthResponse(
    { data: { session } },
    establish,
  );

  expect(completion.kind).toBe('session');
  expect(establish).toHaveBeenCalledTimes(1);
  expect(establish.mock.calls[0][0].access_token).toBe('access');
  expect(establish.mock.calls[0][1]).toEqual(session.user);
});

test('keeps verification and 2FA responses session-free', async () => {
  const establish = mock(async () => undefined);

  expect(
    await completeAuthResponse(
      { data: { requires_verification: true, email: 'new@memento.test' } },
      establish,
    ),
  ).toEqual({ kind: 'verification-required', email: 'new@memento.test' });
  expect(
    await completeAuthResponse(
      { data: { requires_2fa: true, two_fa_token: 'pending' } },
      establish,
    ),
  ).toEqual({ kind: 'two-factor-required', token: 'pending' });
  expect(establish).not.toHaveBeenCalled();
});
