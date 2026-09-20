import { useEffect, useRef, useState } from 'react';
import { TextInput as RNTextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVerify2FA } from '@/hooks/mutations/use-auth-mutations';
import * as Haptics from 'expo-haptics';
import { normalizeAppHref } from '@/lib/navigation';
import { useUiStore, useAuthStore } from '@/store';

export function useTwoFactorLogic() {
  const router = useRouter();
  const { token: routeToken, redirect } = useLocalSearchParams<{ token?: string; redirect?: string | string[] }>();
  const storeToken = useAuthStore((s) => s.twoFactorPendingToken);
  const activeToken = storeToken || routeToken;
  const { mutate, isPending } = useVerify2FA();

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const inputRefs = useRef<(RNTextInput | null)[]>([]);

  useEffect(() => {
    if (!activeToken) {
      router.replace('/(auth)/login');
      return;
    }
    setTimeout(() => inputRefs.current[0]?.focus(), 300);
  }, [activeToken]);

  function handleDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(index: number, key: string) {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleSubmit() {
    const fullCode = code.join('');
    if (fullCode.length < 6) return;

    setError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    mutate({ two_fa_token: activeToken!, code: fullCode }, {
      onSuccess: () => {
        useAuthStore.getState().setTwoFactorPendingToken(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const redirectValue = Array.isArray(redirect) ? redirect[0] : redirect;
        const preferredHref = normalizeAppHref(redirectValue);
        if (preferredHref) useUiStore.getState().setPendingDeepLink(preferredHref);
      },
      onError: (err: any) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(err?.message ?? 'Invalid code. Please try again.');
        setCode(['', '', '', '', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    });
  }

  const filled = code.join('').length === 6;

  return {
    code,
    loading: isPending,
    error,
    inputRefs,
    handleDigit,
    handleKeyPress,
    handleSubmit,
    filled,
    router,
  };
}
