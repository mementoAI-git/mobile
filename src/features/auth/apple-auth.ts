import * as AppleAuthentication from 'expo-apple-authentication';

export type NativeAppleAuthResult =
  | {
      success: true;
      identityToken: string;
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
      user,
    };
  } catch (error: any) {
    if (error?.code === 'ERR_REQUEST_CANCELED') {
      return { success: false, cancelled: true };
    }
    return { success: false, error: error?.message || 'Apple sign-in failed' };
  }
}
