// @ts-nocheck
import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import {
  configureGoogleSignIn,
  resetGoogleSignInConfigForTesting,
  signInWithGoogleNative,
  signOutGoogleNative,
} from './google-auth';

describe('signInWithGoogleNative', () => {
  beforeEach(() => {
    resetGoogleSignInConfigForTesting();
  });

  test('returns idToken and user profile on successful sign in', async () => {
    GoogleSignin.configure = mock(() => {});
    GoogleSignin.hasPlayServices = mock(async () => true);
    GoogleSignin.signIn = mock(async () => ({
      type: 'success',
      data: {
        idToken: 'mock-google-id-token',
        user: {
          id: 'google-user-1',
          name: 'Jane Doe',
          email: 'jane@example.com',
        },
      },
    }));

    const result = await signInWithGoogleNative();
    expect(result.success).toBe(true);
    expect(result.idToken).toBe('mock-google-id-token');
    expect(result.user?.name).toBe('Jane Doe');
    expect(GoogleSignin.hasPlayServices).toHaveBeenCalledTimes(1);
  });

  test('handles user cancellation gracefully', async () => {
    GoogleSignin.configure = mock(() => {});
    GoogleSignin.hasPlayServices = mock(async () => true);
    GoogleSignin.signIn = mock(async () => ({
      type: 'cancelled',
      data: null,
    }));

    const result = await signInWithGoogleNative();
    expect(result.success).toBe(false);
    expect(result.cancelled).toBe(true);
  });

  test('handles sign-in cancelled exception code', async () => {
    GoogleSignin.configure = mock(() => {});
    GoogleSignin.hasPlayServices = mock(async () => true);
    GoogleSignin.signIn = mock(async () => {
      const err = new Error('User cancelled');
      err.code = statusCodes.SIGN_IN_CANCELLED;
      throw err;
    });

    const result = await signInWithGoogleNative();
    expect(result.success).toBe(false);
    expect(result.cancelled).toBe(true);
  });

  test('reports when play services are not available', async () => {
    GoogleSignin.configure = mock(() => {});
    GoogleSignin.hasPlayServices = mock(async () => {
      const err = new Error('Play services unavailable');
      err.code = statusCodes.PLAY_SERVICES_NOT_AVAILABLE;
      throw err;
    });

    const result = await signInWithGoogleNative();
    expect(result.success).toBe(false);
    expect(result.error).toBe('Google Play Services not available');
  });

  test('signs out cleanly without throwing', async () => {
    GoogleSignin.signOut = mock(async () => null);
    await signOutGoogleNative();
    expect(GoogleSignin.signOut).toHaveBeenCalledTimes(1);
  });
});
