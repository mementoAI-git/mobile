import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRegister } from '@/hooks/mutations/use-auth-mutations';
import type { IAuth } from '@/types';
import { establishSession } from '@/features/auth/session-coordinator';
import * as Haptics from 'expo-haptics';

const schema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type RegisterFormData = z.infer<typeof schema>;

export function useRegisterLogic() {
  const router = useRouter();
  const { mutate, isPending, error } = useRegister();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = (data: RegisterFormData) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    mutate(data, {
      onSuccess: async (res) => {
        const { user, ...auth } = res.data;
        await establishSession(auth as IAuth, user);
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
    onSubmit: form.handleSubmit(onSubmit),
    router,
  };
}
