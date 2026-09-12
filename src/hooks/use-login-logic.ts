import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLogin } from '@/hooks/mutations/use-auth-mutations';
import { useToast } from '@/components/ui/Toast';
import { useUiStore } from '@/store';
import client from '@/api/client';
import endpoint from '@/api/endpoint';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { Passkey } from 'react-native-passkey';
import { storageKeys } from '@/constants/storage-keys';
import { AUTH_SESSION_RETURN_URL, normalizeAppHref, oauthCallbackUrl } from '@/lib/navigation';
import { establishSession, restoreSessionWithCredentials } from '@/features/auth/session-coordinator';
import {
  classifyPasskeyError,
  selectSecurityLoginMethod,
} from '@/features/security/security-flow';
import { normalizeAuthCompletion } from '@/api/contract-adapter';
import { completeAuthResponse } from '@/features/auth/auth-completion';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginFormData = z.infer<typeof schema>;

export function useLoginLogic() {
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string | string[] }>();
  const { toast } = useToast();
  const { mutate, isPending } = useLogin();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [securityLoginLabel, setSecurityLoginLabel] = useState('Sign in securely');

  const form = useForm<LoginFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    let mounted = true;
    Promise.all([
      SecureStore.getItemAsync(storageKeys.passkeyCredentialId),
      SecureStore.getItemAsync(storageKeys.biometricsEnabled),
    ]).then(([passkeyCredentialId, biometricsEnabled]) => {
      if (!mounted) return;
      const method = selectSecurityLoginMethod({
        hasNativePasskey: Boolean(passkeyCredentialId),
        hasBiometricFallback: biometricsEnabled === 'true',
      });
      setSecurityLoginLabel(
        method === 'passkey'
          ? 'Sign in with a passkey'
          : method === 'biometric-fallback'
            ? 'Sign in with Face ID / Touch ID'
            : 'Sign in securely',
      );
    });
    return () => {
      mounted = false;
    };
  }, []);

  const getPreferredPostAuthHref = () => {
    const redirectValue = Array.isArray(redirect) ? redirect[0] : redirect;
    return normalizeAppHref(redirectValue) ?? useUiStore.getState().pendingDeepLink;
  };

  const onSubmit = (data: LoginFormData) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    mutate(data, {
      onSuccess: (res) => {
        const completion = normalizeAuthCompletion(res);
        if (completion.kind === 'two-factor-required') {
          router.push({
            pathname: '/(auth)/two-factor',
            params: {
              token: completion.token,
              ...(getPreferredPostAuthHref() ? { redirect: getPreferredPostAuthHref() as string } : {}),
            },
          });
          return;
        }
      },
      onError: (err: any) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        if (err?.data?.requires_verification || err?.requires_verification) {
          router.push(`/(auth)/verify-email?email=${data.email}`);
          return;
        }
        const message = err?.message || 'Login failed. Please try again.';
        toast(message, 'error');
      },
    });
  };

  const handleGoogleLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGoogleLoading(true);
    try {
      const res = await client.get(`${endpoint.oauth}google`, {
        params: { redirect_uri: oauthCallbackUrl('google') },
      });
      const url: string | undefined = res.data?.data?.url;
      if (!url) return;

      const { openAuthSessionAsync } = await import('expo-web-browser');
      await openAuthSessionAsync(url, AUTH_SESSION_RETURN_URL);
    } catch {
      // silent
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAppleLoading(true);
    try {
      const res = await client.get(`${endpoint.oauth}apple`, {
        params: { redirect_uri: oauthCallbackUrl('apple') },
      });
      const url: string | undefined = res.data?.data?.url;
      if (!url) return;

      const { openAuthSessionAsync } = await import('expo-web-browser');
      await openAuthSessionAsync(url, AUTH_SESSION_RETURN_URL);
    } catch {
      // silent
    } finally {
      setAppleLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPasskeyLoading(true);
    try {
      const [passkeyCredentialId, biometricsEnabled] = await Promise.all([
        SecureStore.getItemAsync(storageKeys.passkeyCredentialId),
        SecureStore.getItemAsync(storageKeys.biometricsEnabled),
      ]);
      const method = selectSecurityLoginMethod({
        hasNativePasskey: Boolean(passkeyCredentialId),
        hasBiometricFallback: biometricsEnabled === 'true',
      });

      if (method === 'unenrolled') {
        toast('Secure sign-in is not set up. Sign in with your password, then add it in Settings → Security.', 'error');
        return;
      }

      if (method === 'passkey') {
        const email = await SecureStore.getItemAsync(storageKeys.passkeyEmail);
        if (!email) {
          toast('Your passkey account could not be identified. Sign in with your password and add the passkey again.', 'error');
          return;
        }

        try {
          const skipAuth = { skipAuth: true } as const;
          const begin = await client.post(endpoint.passkeyLoginBegin, { email }, skipAuth as never);
          const { challenge_id: challengeId, ...request } = begin.data?.data ?? {};
          const assertion = await Passkey.get(request);
          const complete = await client.post(endpoint.passkeyLoginComplete, {
            challenge_id: challengeId,
            response: assertion,
          }, skipAuth as never);
          const completion = await completeAuthResponse(complete.data, establishSession);
          if (completion.kind !== 'session') throw new Error('Missing passkey session');

          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
          if (classifyPasskeyError(error) !== 'cancelled') {
            toast('Passkey sign-in could not be completed. Try again or use your password.', 'error');
          }
        }
        return;
      }

      const refreshToken = await SecureStore.getItemAsync(
        storageKeys.biometricsRefreshToken,
        { requireAuthentication: true, authenticationPrompt: 'Sign in to Memento securely' },
      );

      if (!refreshToken) {
        toast('Biometric session expired. Please sign in with your password and re-enroll biometrics in Settings.', 'error');
        setPasskeyLoading(false);
        return;
      }

      // Exchange refresh_token for a new access/refresh token pair
      const res = await client.post(
        endpoint.refreshToken,
        { refresh_token: refreshToken },
        { skipAuth: true } as never,
      );
      const completion = await completeAuthResponse(res.data, establishSession);

      if (completion.kind !== 'session') {
        toast('Session expired. Please sign in with your password.', 'error');
        setPasskeyLoading(false);
        return;
      }

      // Persist the new token pair and update the stored refresh_token silently
      await SecureStore.setItemAsync(
        storageKeys.biometricsRefreshToken,
        completion.credentials.refresh_token,
        { requireAuthentication: true },
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // User cancelled the biometric prompt — no toast needed
    } finally {
      setPasskeyLoading(false);
    }
  };

  return {
    form,
    isPending,
    googleLoading,
    appleLoading,
    passkeyLoading,
    securityLoginLabel,
    onSubmit: form.handleSubmit(onSubmit),
    handleGoogleLogin,
    handleAppleLogin,
    handlePasskeyLogin,
    router,
  };
}
