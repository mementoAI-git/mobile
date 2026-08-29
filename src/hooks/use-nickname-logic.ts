import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Haptics from 'expo-haptics';
import { put } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { useAuthStore, useUserStore } from '@/store';

const schema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(80),
  nickname: z.string().min(2, 'Nickname must be at least 2 characters').max(30),
});

type FormData = z.infer<typeof schema>;

export function useNicknameLogic() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateSessionUser = useAuthStore((s) => s.updateUser);
  const setUser = useUserStore((s) => s.setUser);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: user?.fullname ?? `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim(),
      nickname: user?.nickname ?? '',
    },
  });

  const onSubmit = async (data: FormData) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await put(endpoint.profile, {
        fullname: data.fullName.trim(),
        nickname: data.nickname.trim(),
      });
      if (user && setUser) {
        const updatedUser = {
          ...user,
          nickname: data.nickname.trim(),
          fullname: data.fullName.trim(),
        };
        updateSessionUser(updatedUser);
        setUser(updatedUser);
      }
    } catch {
      // non-blocking
    }
    router.push('/(onboard)/preferences');
  };

  const handleSkip = () => {
    Haptics.selectionAsync();
    router.push('/(onboard)/preferences');
  };

  return {
    control,
    handleSubmit,
    onSubmit,
    handleSkip,
    errors,
    isSubmitting,
  };
}
