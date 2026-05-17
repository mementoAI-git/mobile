import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useVerifyEmail } from '@/hooks/mutations/use-auth-mutations';
import * as Haptics from 'expo-haptics';

export function useVerifyEmailLogic() {
  const router = useRouter();
  const { token: initialToken } = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState(initialToken ?? '');
  const { mutate, isPending, error, isSuccess } = useVerifyEmail();

  const handleVerify = () => {
    if (!token.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    mutate(token.trim(), {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
      onError: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      },
    });
  };

  return {
    token,
    setToken,
    isPending,
    error,
    isSuccess,
    handleVerify,
    router,
  };
}
