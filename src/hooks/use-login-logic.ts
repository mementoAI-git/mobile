import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLogin } from '@/hooks/mutations/use-auth-mutations';
import { useToast } from '@/components/ui/Toast';
import client from '@/api/client';
import endpoint from '@/api/endpoint';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

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
        const target = resData.onboarding_status === 'never' ? '/(onboard)' : '/(tabs)/overview';
        router.replace(target as any);
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
        params: { redirect_uri: 'memento://oauth-callback?provider=google' },
      });
      const url: string | undefined = res.data?.data?.url;
      if (!url) return;

      const { openAuthSessionAsync } = await import('expo-web-browser');
      await openAuthSessionAsync(url, 'memento://');
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
        params: { redirect_uri: 'memento://oauth-callback?provider=apple' },
      });
      const url: string | undefined = res.data?.data?.url;
      if (!url) return;

      const { openAuthSessionAsync } = await import('expo-web-browser');
      await openAuthSessionAsync(url, 'memento://');
    } catch {
      // silent
    } finally {
      setAppleLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const enabled = await SecureStore.getItemAsync('memento.biometrics_enabled');
    
    if (enabled === 'true') {
      try {
        setPasskeyLoading(true);
        const password = await SecureStore.getItemAsync('memento.biometrics_password', {
          requireAuthentication: true,
          authenticationPrompt: 'Authenticate to sign into Memento securely',
        });
        const email = await SecureStore.getItemAsync('memento.biometrics_email');
        
        if (email && password) {
          mutate({ email, password }, {
            onSuccess: (res) => {
              const resData = res.data as any;
              const target = resData.onboarding_status === 'never' ? '/(onboard)' : '/(tabs)/overview';
              router.replace(target as any);
            },
            onError: () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Sign In Failed', 'Biometric authentication failed. Please verify your credentials or sign in with your password.');
            },
            onSettled: () => {
              setPasskeyLoading(false);
            }
          });
        } else {
          setPasskeyLoading(false);
          Alert.alert('Not Configured', 'Biometric credentials could not be found. Please log in with your email/password and enable Biometrics in settings.');
        }
      } catch (err) {
        setPasskeyLoading(false);
        // User cancelled biometrics prompt
      }
    } else {
      Alert.alert(
        'Passkey & Biometrics',
        'Biometric sign-in is not registered yet. Log in with your email & password first, then enable Biometrics in Settings.\n\nAlternatively, you can authenticate using a Web Passkey.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Use Web Passkey', 
            onPress: async () => {
              try {
                setPasskeyLoading(true);
                const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';
                const webBase = apiBase.replace('/api', '');
                const { openAuthSessionAsync } = await import('expo-web-browser');
                const redirectUrl = 'memento://oauth-callback';
                const authUrl = `${webBase}/login?passkey=true&redirect=${encodeURIComponent(redirectUrl)}`;
                await openAuthSessionAsync(authUrl, 'memento://');
              } catch (err) {
                // silent
              } finally {
                setPasskeyLoading(false);
              }
            }
          }
        ]
      );
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
