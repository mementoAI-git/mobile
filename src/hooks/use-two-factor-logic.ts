import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVerify2FA } from '@/hooks/mutations/use-auth-mutations';
import * as Haptics from 'expo-haptics';
import { isCompleteOtp, normalizeOtpInput } from '@/features/auth/email-verification';
import { normalizeAppHref } from '@/lib/navigation';
import { useUiStore, useAuthStore } from '@/store';

import { toast } from '@/components/ui/Toast';

export function useTwoFactorLogic() {
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string | string[] }>();
  const activeToken = useAuthStore((s) => s.twoFactorPendingToken);
  const { mutate, isPending } = useVerify2FA();

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!activeToken) {
      toast('Authentication session expired. Please sign in again.', 'error');
      router.replace('/(auth)/login');
      return;
    }
  }, [activeToken, router]);

  const handleCodeChange = useCallback((value: string) => {
    if (isPending) return;
    setCode(normalizeOtpInput(value));
    setError('');
  }, [isPending]);

  const handleBackToSignIn = useCallback(() => {
    Haptics.selectionAsync();
    router.replace('/(auth)/login');
  }, [router]);

  const handleSubmit = useCallback(() => {
    if (isPending || !activeToken || !isCompleteOtp(code)) return;

    setError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    mutate({ two_fa_token: activeToken, code }, {
      onSuccess: () => {
        useAuthStore.getState().setTwoFactorPendingToken(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const redirectValue = Array.isArray(redirect) ? redirect[0] : redirect;
        const preferredHref = normalizeAppHref(redirectValue);
        if (preferredHref) useUiStore.getState().setPendingDeepLink(preferredHref);
      },
      onError: (err: any) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        if (!isMountedRef.current) return;
        setError(err?.message ?? 'Invalid code. Please try again.');
        setCode('');
      }
    });
  }, [activeToken, code, isPending, mutate, redirect]);

  const filled = isCompleteOtp(code);

  return {
    code,
    loading: isPending,
    error,
    handleCodeChange,
    handleBackToSignIn,
    handleSubmit,
    filled,
    router,
  };
}
