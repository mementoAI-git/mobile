import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRegister } from '@/hooks/mutations/use-auth-mutations';
import * as Haptics from 'expo-haptics';
import { normalizeAuthCompletion } from '@/api/contract-adapter';
import { toast } from '@/components/ui/Toast';

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
      onError: (err: any) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        const raw = err?.message || err?.data?.message || '';
        let message = 'Registration failed. Please try again.';
        if (/network error/i.test(raw) || err?.code === 'ERR_NETWORK') {
          message = 'Unable to connect to Memento. Please check your internet connection and try again.';
        } else if (/timeout/i.test(raw) || err?.code === 'ECONNABORTED') {
          message = 'The connection timed out. Please try again.';
        } else if (/already exists/i.test(raw) || /duplicate/i.test(raw) || err?.status === 409 || err?.data?.status === 409) {
          message = 'An account with this email already exists. Try signing in instead.';
        } else if (raw && !/object Object/i.test(raw)) {
          message = raw;
        }
        toast(message, 'error');
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
