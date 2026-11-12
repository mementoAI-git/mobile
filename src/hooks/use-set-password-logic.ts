import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSetPassword } from '@/hooks/mutations/use-auth-mutations';
import { buildSetPasswordPayload } from '@/features/auth/set-password-payload';
import * as Haptics from 'expo-haptics';

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });

export type SetPasswordFormData = z.infer<typeof schema>;

export function useSetPasswordLogic() {
  const router = useRouter();
  const { token, email } = useLocalSearchParams<{ token: string; email?: string }>();
  const { mutate, isPending, error, isSuccess } = useSetPassword();

  const form = useForm<SetPasswordFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: '',
      confirm: '',
    },
  });

  const onSubmit = (data: SetPasswordFormData) => {
    if (!token) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    mutate(buildSetPasswordPayload(token, data.password, email), {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
      onError: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      },
    });
  };

  return {
    form,
    isPending,
    error,
    isSuccess,
    onSubmit: form.handleSubmit(onSubmit),
    router,
  };
}
