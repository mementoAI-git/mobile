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
    console.log('[ForgotPassword] 🌐 API base URL:', process.env.EXPO_PUBLIC_API_BASE_URL);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    mutate(email.trim(), {
      onSuccess: (res) => {
        console.log('[ForgotPassword] ✅ Success response:', JSON.stringify(res?.data ?? res, null, 2));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSent(true);
      },
      onError: (err: any) => {
        console.log('[ForgotPassword] ❌ Error response:', JSON.stringify(err?.response?.data ?? err?.message ?? err, null, 2));
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
