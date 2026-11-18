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

describe('googleClientIdsFor', () => {
  const { googleClientIdsFor, DEFAULT_GOOGLE_WEB_CLIENT_ID, DEFAULT_GOOGLE_IOS_CLIENT_ID } =
    require('./google-auth');
  const SSO_TEST_WEB = '680261459129-g1l36cheppg1e29slepth6dpvngjqjj1.apps.googleusercontent.com';
  const SSO_TEST_IOS = '680261459129-nupaa1nhgpkolmiicmcho7ffipl939lf.apps.googleusercontent.com';

  // An over-the-air update reaches iPhone builds made before the switch, whose
  // URL scheme is still the SSO Test iOS client. They must keep that pair.
  test('keeps the SSO Test clients on iPhone builds before 45', () => {
    expect(googleClientIdsFor({ os: 'ios', buildNumber: '44', isDev: false })).toEqual({
      webClientId: SSO_TEST_WEB,
      iosClientId: SSO_TEST_IOS,
    });
  });

  test("uses Memento's clients from iPhone build 45", () => {
    for (const buildNumber of ['45', '120']) {
      expect(googleClientIdsFor({ os: 'ios', buildNumber, isDev: false })).toEqual({
        webClientId: DEFAULT_GOOGLE_WEB_CLIENT_ID,
        iosClientId: DEFAULT_GOOGLE_IOS_CLIENT_ID,
      });
    }
  });

  test("uses Memento's clients in development builds, whatever their build number", () => {
    expect(googleClientIdsFor({ os: 'ios', buildNumber: '1', isDev: true }).iosClientId).toBe(
      DEFAULT_GOOGLE_IOS_CLIENT_ID,
    );
  });

  test("uses Memento's clients when the build number is unknown", () => {
    expect(googleClientIdsFor({ os: 'ios', buildNumber: null, isDev: false }).iosClientId).toBe(
      DEFAULT_GOOGLE_IOS_CLIENT_ID,
    );
  });

  // Android matches the app by package and signing key, not by a built-in
  // scheme, and Memento's Android client has the EAS key.
  test("uses Memento's web client on Android for every build", () => {
    expect(googleClientIdsFor({ os: 'android', buildNumber: '1', isDev: false })).toEqual({
      webClientId: DEFAULT_GOOGLE_WEB_CLIENT_ID,
      iosClientId: undefined,
    });
  });
});
