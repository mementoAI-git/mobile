import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

/**
 * Sign in with Apple is native to iOS only. Apple has no Android sign-in
 * (it would need a browser flow the API does not have yet), so the button is
 * hidden there instead of failing when tapped.
 */
export function appleSignInShown(os: string = Platform.OS): boolean {
  return os === 'ios';
}

export type NativeAppleAuthResult =
  | {
      success: true;
      identityToken: string;
      /** One-time code the server exchanges for the token it revokes on account deletion. */
      authorizationCode?: string;
      user?: { name?: { firstName?: string; lastName?: string } };
      cancelled?: false;
      error?: never;
    }
  | { success: false; cancelled?: boolean; error?: string; identityToken?: never };

export async function signInWithAppleNative(): Promise<NativeAppleAuthResult> {
  try {
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      return { success: false, error: 'Apple Sign-In is not supported on this device' };
    }

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      return { success: false, error: 'Apple did not return an identity token' };
    }

    const firstName = credential.fullName?.givenName || undefined;
    const lastName = credential.fullName?.familyName || undefined;
    const user = firstName || lastName ? { name: { firstName, lastName } } : undefined;

    return {
      success: true,
      identityToken: credential.identityToken,
      ...(credential.authorizationCode ? { authorizationCode: credential.authorizationCode } : {}),
      user,
    };
  } catch (error: any) {
    if (error?.code === 'ERR_REQUEST_CANCELED') {
      return { success: false, cancelled: true };
    }
    return { success: false, error: error?.message || 'Apple sign-in failed' };
  }
}

/** Body for POST /auth/oauth/apple from a successful native sign-in. */
export function appleOAuthBody(result: Extract<NativeAppleAuthResult, { success: true }>) {
  return {
    id_token: result.identityToken,
    ...(result.authorizationCode ? { code: result.authorizationCode } : {}),
    ...(result.user ? { user: result.user } : {}),
  };
}
