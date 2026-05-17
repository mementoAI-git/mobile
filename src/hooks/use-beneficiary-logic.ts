import { useState } from 'react';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAddBeneficiary } from '@/hooks/mutations/use-beneficiary-mutations';
import { post } from '@/api/mutations';
import endpoint from '@/api/endpoint';

export function useBeneficiaryLogic() {
  const router = useRouter();
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
    router.replace('/(tabs)/overview');
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
