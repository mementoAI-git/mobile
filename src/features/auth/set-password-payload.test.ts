// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { buildSetPasswordPayload } from './set-password-payload';

describe('set-password request', () => {
  test('sends the email with a 6-digit code, which the API needs to match it', () => {
    expect(buildSetPasswordPayload('012345', 'New-Password-1', ' Jane@Example.com ')).toEqual({
      token: '012345',
      password: 'New-Password-1',
      email: 'jane@example.com',
    });
  });

  test('omits the email when the screen has none, as for emailed links', () => {
    expect(buildSetPasswordPayload('7f1c0d3e-1111-4222-8333-944455556666', 'pw', undefined)).toEqual({
      token: '7f1c0d3e-1111-4222-8333-944455556666',
      password: 'pw',
    });
    expect(buildSetPasswordPayload('012345', 'pw', '')).toEqual({ token: '012345', password: 'pw' });
  });
});
