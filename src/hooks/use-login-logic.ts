import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLogin } from '@/hooks/mutations/use-auth-mutations';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/store';
import client from '@/api/client';
import endpoint from '@/api/endpoint';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { storageKeys } from '@/constants/storage-keys';
import { AUTH_SESSION_RETURN_URL, getPostAuthHref, oauthCallbackUrl } from '@/lib/navigation';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginFormData = z.infer<typeof schema>;

export function useLoginLogic() {
  const router = useRouter();
  const { toast } = useToast();
  const { mutate, isPending } = useLogin();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = (data: LoginFormData) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    mutate(data, {
      onSuccess: (res) => {
        const resData = res.data as any;
        if (resData.requires_2fa) {
          router.push(`/(auth)/two-factor?token=${resData.two_fa_token}`);
          return;
        }
        router.replace(getPostAuthHref(resData.onboarding_status));
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

    const enabled = await SecureStore.getItemAsync(storageKeys.biometricsEnabled);

    if (enabled !== 'true') {
      // Not enrolled — show guidance via toast (no Alert)
      toast('Biometric login is not set up. Sign in with your password first, then enable it in Settings → Security.', 'error');
      return;
    }

    setPasskeyLoading(true);
    try {
      // Retrieve the refresh_token — OS biometric prompt fires here.
      // v2: replace with native WebAuthn passkey. See TODO.md.
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
      const res = await client.post(endpoint.refreshToken, { refresh_token: refreshToken });
      const newTokens = res.data?.data as any;

      if (!newTokens?.access_token) {
        toast('Session expired. Please sign in with your password.', 'error');
        setPasskeyLoading(false);
        return;
      }

      // Persist the new token pair and update the stored refresh_token silently
      await useAuthStore.getState().setAuth(newTokens);
      await SecureStore.setItemAsync(
        storageKeys.biometricsRefreshToken,
        newTokens.refresh_token,
        { requireAuthentication: true },
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(getPostAuthHref(newTokens.onboarding_status));
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
    onSubmit: form.handleSubmit(onSubmit),
    handleGoogleLogin,
    handleAppleLogin,
    handlePasskeyLogin,
    router,
  };
}
