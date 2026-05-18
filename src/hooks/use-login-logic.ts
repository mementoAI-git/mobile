import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLogin } from '@/hooks/mutations/use-auth-mutations';
import client from '@/api/client';
import endpoint from '@/api/endpoint';
import * as Haptics from 'expo-haptics';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginFormData = z.infer<typeof schema>;

export function useLoginLogic() {
  const router = useRouter();
  const { mutate, isPending, error } = useLogin();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

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
        }
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

  return {
    form,
    isPending,
    error,
    googleLoading,
    appleLoading,
    onSubmit: form.handleSubmit(onSubmit),
    handleGoogleLogin,
    handleAppleLogin,
    router,
  };
}
