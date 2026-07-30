import { useRouter } from 'expo-router';
import { useBeneficiaries } from '@/hooks/queries/use-beneficiaries';
import { useGroups } from '@/hooks/queries/use-groups';
import { useRemoveBeneficiary, useResendInvite } from '@/hooks/mutations/use-beneficiary-mutations';
import { normalizeCollection } from '@/features/beneficiaries/collections';
import { useUiStore } from '@/store';
import * as Haptics from 'expo-haptics';
import type { IBeneficiary, IGroup } from '@/types';

export function useBeneficiariesSettingsLogic() {
  const router = useRouter();
  const openSheet = useUiStore((s) => s.openSheet);
  const beneficiariesQuery = useBeneficiaries();
  const groupsQuery = useGroups();
  const beneficiaries = normalizeCollection<IBeneficiary>(beneficiariesQuery.data);
  const groups = normalizeCollection<IGroup>(groupsQuery.data);
  const remove = useRemoveBeneficiary();
  const resend = useResendInvite();

  const handleRemove = (id: string, name: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    openSheet('security-confirmation', {
      kind: 'remove-beneficiary',
      subjectName: name,
      onConfirm: () => remove.mutateAsync(id),
    });
  };

  const handleResend = (email: string) => {
    Haptics.selectionAsync();
    resend.mutate(email);
  };

  const handleAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    openSheet('add-beneficiary');
  };

  return {
    beneficiaries: beneficiaries ?? [],
    groups,
    isLoading: beneficiariesQuery.isLoading || groupsQuery.isLoading,
    isError: beneficiariesQuery.isError || groupsQuery.isError,
    refetch: () => Promise.all([beneficiariesQuery.refetch(), groupsQuery.refetch()]),
    handleRemove,
    handleResend,
    handleAdd,
    openSheet,
    router,
  };
}
