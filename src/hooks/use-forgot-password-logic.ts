import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useForgotPassword } from '@/hooks/mutations/use-auth-mutations';
import * as Haptics from 'expo-haptics';

export function useForgotPasswordLogic() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { mutate, isPending, error } = useForgotPassword();

  const handleSubmit = () => {
    if (!email.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    mutate(email.trim(), {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSent(true);
        router.push({
          pathname: '/(auth)/verify-email',
          params: { email: email.trim(), mode: 'reset-password' },
        });
      },
      onError: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      },
    });
  };

  return {
    email,
    setEmail,
    sent,
    isPending,
    error,
    handleSubmit,
    router,
  };
}
