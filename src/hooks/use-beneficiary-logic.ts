import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { useAddBeneficiary } from '@/hooks/mutations/use-beneficiary-mutations';
import { post } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { useAuthStore, useUserStore } from '@/store';

export function useBeneficiaryLogic() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('');
  const { mutate, isPending } = useAddBeneficiary();

  const handleComplete = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await post(endpoint.completeOnboarding, {});
    } catch {
      // non-blocking
    }
    const user = useUserStore.getState().user ?? useAuthStore.getState().user;
    if (user) {
      const completedUser = { ...user, onboarded: true, onboarding_status: 'completed' as const };
      useUserStore.getState().setUser(completedUser);
      useAuthStore.getState().updateUser(completedUser);
    }
  };

  const handleAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!name.trim() || !email.trim() || !relationship) {
      handleComplete();
      return;
    }
    mutate({ name: name.trim(), email: email.trim(), relationship }, { onSuccess: handleComplete });
  };

  const isFormValid = name.trim() && email.trim() && relationship;

  return {
    name,
    setName,
    email,
    setEmail,
    relationship,
    setRelationship,
    isPending,
    handleAdd,
    handleComplete,
    isFormValid,
  };
}
