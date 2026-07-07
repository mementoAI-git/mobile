import { useEffect, useRef, useState } from 'react';
import { TextInput as RNTextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVerify2FA } from '@/hooks/mutations/use-auth-mutations';
import * as Haptics from 'expo-haptics';
import { getPostAuthHref } from '@/lib/navigation';

export function useTwoFactorLogic() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const { mutate, isPending } = useVerify2FA();

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const inputRefs = useRef<(RNTextInput | null)[]>([]);

  useEffect(() => {
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    setTimeout(() => inputRefs.current[0]?.focus(), 300);
  }, [token]);

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
    
    mutate({ two_fa_token: token!, code: fullCode }, {
      onSuccess: (res) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace(getPostAuthHref(res.data.onboarding_status));
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
