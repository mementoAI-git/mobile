import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRegister } from '@/hooks/mutations/use-auth-mutations';
import * as Haptics from 'expo-haptics';
import { normalizeAuthCompletion } from '@/api/contract-adapter';

import { validateRegistrationPassword } from '@/features/auth/registration-policy';

const schema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().superRefine((val, ctx) => {
    const res = validateRegistrationPassword(val);
    if (!res.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: res.message ?? 'Password does not meet requirements',
      });
    }
  }),
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
        const completion = normalizeAuthCompletion(res);
        if (completion.kind === 'verification-required') {
          router.push({
            pathname: '/(auth)/verify-email',
            params: { email: completion.email },
          });
        }
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
