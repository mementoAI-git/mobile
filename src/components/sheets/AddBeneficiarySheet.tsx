import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Button, TextInput } from '@/components/ui';
import { useAddBeneficiary } from '@/hooks/mutations/use-beneficiary-mutations';
import { RELATIONSHIP_OPTIONS } from '@/constants/onboarding';
import { SelectionChip } from '@/components/onboarding/SelectionChip';

import { BottomSheetTextInput, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { FONTS } from '@/constants/tokens';

interface Props {
  onClose: () => void;
}

export function AddBeneficiarySheet({ onClose }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('');
  const { mutate, isPending } = useAddBeneficiary();

  const handleAdd = () => {
    if (!name.trim() || !email.trim() || !relationship) return;
    mutate({ name: name.trim(), email: email.trim(), relationship }, { onSuccess: onClose });
  };

  return (
    <BottomSheetScrollView showsVerticalScrollIndicator={false} className="gap-4">
      <Text
        className="text-2xl text-text-strong mb-4"
        style={{ fontFamily: FONTS.serif }}
      >
        Add Beneficiary
      </Text>

      <TextInput 
        label="Full Name" 
        value={name} 
        onChangeText={setName} 
        placeholder="Their name" 
        InputComponent={BottomSheetTextInput}
      />
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="their@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        InputComponent={BottomSheetTextInput}
      />

      <View className="gap-2">
        <Text className="text-sm font-medium text-text-base">Relationship</Text>
        <View className="flex-row flex-wrap gap-2">
          {RELATIONSHIP_OPTIONS.map((r) => (
            <SelectionChip
              key={r}
              label={r}
              selected={relationship === r}
              onPress={() => setRelationship(r)}
            />
          ))}
        </View>
      </View>

      <View className="flex-row gap-3 mt-4">
        <Button variant="outline" onPress={onClose} className="flex-1">Cancel</Button>
        <Button
          onPress={handleAdd}
          loading={isPending}
          disabled={!name.trim() || !email.trim() || !relationship}
          className="flex-1"
        >
          Send Invite
        </Button>
      </View>
    </BottomSheetScrollView>
  );
}
