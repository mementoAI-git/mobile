// @ts-nocheck
import { describe, expect, spyOn, test } from 'bun:test';
import * as AppleAuthentication from 'expo-apple-authentication';
import { appleSignInShown, signInWithAppleNative } from './apple-auth';

describe('signInWithAppleNative', () => {
  test('returns identityToken and user when authentication succeeds', async () => {
    spyOn(AppleAuthentication, 'isAvailableAsync').mockResolvedValue(true);
    spyOn(AppleAuthentication, 'signInAsync').mockResolvedValue({
      identityToken: 'mock-apple-identity-token',
      fullName: {
        givenName: 'Jane',
        familyName: 'Appleseed',
      },
      email: 'jane@apple.test',
    });

    const result = await signInWithAppleNative();
    expect(result.success).toBe(true);
    expect(result.identityToken).toBe('mock-apple-identity-token');
    expect(result.user?.name).toEqual({
      firstName: 'Jane',
      lastName: 'Appleseed',
    });
  });

  test('reports when apple authentication is not available on device', async () => {
    spyOn(AppleAuthentication, 'isAvailableAsync').mockResolvedValue(false);

    const result = await signInWithAppleNative();
    expect(result.success).toBe(false);
    expect(result.error).toContain('not supported');
  });

  test('handles user cancellation gracefully', async () => {
    spyOn(AppleAuthentication, 'isAvailableAsync').mockResolvedValue(true);
    spyOn(AppleAuthentication, 'signInAsync').mockRejectedValue({
      code: 'ERR_REQUEST_CANCELED',
      message: 'Canceled',
    });

    const result = await signInWithAppleNative();
    expect(result.success).toBe(false);
    expect(result.cancelled).toBe(true);
  });
});

describe('appleSignInShown', () => {
  test('shows Sign in with Apple only on iOS', () => {
    expect(appleSignInShown('ios')).toBe(true);
    // Apple has no Android sign-in; the button only ever failed there.
    expect(appleSignInShown('android')).toBe(false);
    expect(appleSignInShown('web')).toBe(false);
  });
});
