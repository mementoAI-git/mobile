import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useChangePassword, useDeleteAccount } from '@/hooks/mutations/use-auth-mutations';
import * as Haptics from 'expo-haptics';

const schema = z.object({
  current_password: z.string().min(1, 'Required'),
  new_password: z.string().min(8, 'At least 8 characters'),
  confirm: z.string(),
}).refine((d) => d.new_password === d.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
});

export type AccountFormData = z.infer<typeof schema>;

export function useAccountSettingsLogic() {
  const router = useRouter();
  const { mutate: changePassword, isPending, error, isSuccess } = useChangePassword();
  const { mutate: deleteAccount, isPending: deleting } = useDeleteAccount();

  const form = useForm<AccountFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm: '',
    },
  });

  const onSubmit = (data: AccountFormData) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    changePassword(
      { current_password: data.current_password, new_password: data.new_password },
      { 
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          form.reset();
        },
        onError: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      },
    );
  };

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Delete Account',
      'This action is permanent and cannot be undone. All your memories and capsules will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            deleteAccount(undefined, { onSuccess: () => router.replace('/(auth)/login') });
          },
        },
      ],
    );
  };

  return {
    form,
    isPending,
    error,
    isSuccess,
    deleting,
    onSubmit: form.handleSubmit(onSubmit),
    handleDelete,
    router,
  };
}
