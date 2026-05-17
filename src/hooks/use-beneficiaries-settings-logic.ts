import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useBeneficiaries } from '@/hooks/queries/use-beneficiaries';
import { useRemoveBeneficiary, useResendInvite } from '@/hooks/mutations/use-beneficiary-mutations';
import { useUiStore } from '@/store';
import * as Haptics from 'expo-haptics';

export function useBeneficiariesSettingsLogic() {
  const router = useRouter();
  const openSheet = useUiStore((s) => s.openSheet);
  const { data: beneficiariesData, isLoading } = useBeneficiaries();
  const beneficiaries = (beneficiariesData as any)?.data || [];
  const { mutate: remove } = useRemoveBeneficiary();
  const { mutate: resend } = useResendInvite();

  const handleRemove = (id: string, name: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Remove Trustee',
      `Are you sure you want to remove ${name}? They will no longer have access to your memories.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive', 
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            remove(id);
          } 
        },
      ],
    );
  };

  const handleResend = (email: string) => {
    Haptics.selectionAsync();
    resend(email);
  };

  const handleAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    openSheet('add-beneficiary');
  };

  return {
    beneficiaries: beneficiaries ?? [],
    isLoading,
    handleRemove,
    handleResend,
    handleAdd,
    openSheet,
    router,
  };
}
