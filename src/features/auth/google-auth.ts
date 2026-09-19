import { Platform } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

export const DEFAULT_GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  '680261459129-g1l36cheppg1e29slepth6dpvngjqjj1.apps.googleusercontent.com';

export const DEFAULT_GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
  '680261459129-nupaa1nhgpkolmiicmcho7ffipl939lf.apps.googleusercontent.com';

export function configureGoogleSignIn(
  webClientId = DEFAULT_GOOGLE_WEB_CLIENT_ID,
  iosClientId = DEFAULT_GOOGLE_IOS_CLIENT_ID,
) {
  GoogleSignin.configure({
    webClientId,
    ...(Platform.OS === 'ios' && iosClientId ? { iosClientId } : {}),
    scopes: ['profile', 'email'],
  });
}

export function resetGoogleSignInConfigForTesting() {
  // no-op
}

export type NativeGoogleAuthResult =
  | { success: true; idToken: string; user?: any; cancelled?: false; error?: never }
  | { success: false; cancelled?: boolean; error?: string; idToken?: never };

export async function signInWithGoogleNative(): Promise<NativeGoogleAuthResult> {
  try {
    configureGoogleSignIn();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (response.type === 'cancelled') {
      return { success: false, cancelled: true };
    }

    const idToken = response.data?.idToken ?? (response as any).idToken;
    if (!idToken) {
      return { success: false, error: 'Google did not return an ID token' };
    }

    return {
      success: true,
      idToken,
      user: response.data?.user ?? (response as any).user,
    };
  } catch (error: any) {
    if (error?.code === statusCodes.SIGN_IN_CANCELLED) {
      return { success: false, cancelled: true };
    }
    if (error?.code === statusCodes.IN_PROGRESS) {
      return { success: false, error: 'Sign-in already in progress' };
    }
    if (error?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return { success: false, error: 'Google Play Services not available' };
    }
    return { success: false, error: error?.message || 'Google sign-in failed' };
  }
}

export async function signOutGoogleNative(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    // ignore
  }
}
