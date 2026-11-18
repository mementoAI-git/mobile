// @ts-nocheck
import { describe, expect, mock, test } from 'bun:test';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { signOutIdentityProviders } from './identity-provider-sign-out';

const read = (path: string) => Bun.file(new URL(`../../../${path}`, import.meta.url)).text();

// Google keeps the last account signed in on the device. Without signing it
// out, the next "Sign in with Google" silently reuses that account instead of
// offering the account chooser.
describe('signing out of identity providers', () => {
  test('signs the device out of Google', async () => {
    GoogleSignin.signOut = mock(async () => null);

    await signOutIdentityProviders();

    expect(GoogleSignin.signOut).toHaveBeenCalledTimes(1);
  });

  test('never fails when there is no Google session', async () => {
    GoogleSignin.signOut = mock(async () => {
      throw new Error('no Google session');
    });

    await expect(signOutIdentityProviders()).resolves.toBeUndefined();
  });

  test('runs whenever a session ends', async () => {
    const source = await read('src/features/auth/session-coordinator.ts');
    const terminate = source.slice(source.indexOf('export function terminateSession'));

    expect(terminate).toContain('signOutIdentityProviders()');
  });
});
