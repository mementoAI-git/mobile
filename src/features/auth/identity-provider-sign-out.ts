import { signOutGoogleNative } from './google-auth';

/**
 * Signs the device out of the providers used to sign in to Memento, so the
 * next sign-in offers the account chooser instead of reusing the last account.
 * Apple has no device sign-out; its sheet always asks again.
 */
export async function signOutIdentityProviders(): Promise<void> {
  await signOutGoogleNative();
}
