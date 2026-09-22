import React from 'react';
import { Text, View } from 'react-native';
import { Mail, Trash2 } from 'lucide-react-native';
import { Avatar, Button } from '@/components/ui';
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { useUiStore } from '@/store';
import type { IBeneficiary } from '@/types';

export function BeneficiaryActionsSheet({
  beneficiary,
  onResend,
  onRemove,
  onClose,
}: {
  beneficiary: IBeneficiary;
  onResend: (email: string) => void;
  onRemove: (id: string, name: string) => void;
  onClose?: () => void;
}) {
  return (
    <View className="px-1 pb-2 pt-3">
      <View className="items-center">
        <Avatar uri={beneficiary.user?.picture_url} name={beneficiary.name} size="xl" />
        <Text className="mt-4" style={TYPE.cardTitle}>
          {beneficiary.name}
        </Text>
        <Text className="mt-1" style={TYPE.body}>
          {beneficiary.email}
        </Text>
        <Text className="mt-1" style={TYPE.bodySmall}>
          {beneficiary.relationship || 'Beneficiary'}
        </Text>
      </View>
      {beneficiary.status === 'pending' && (
        <Button
          variant="secondary"
          size="lg"
          className="mt-7 h-14"
          leftIcon={<Mail size={20} color={COLORS.textStrong} />}
          onPress={() => {
            onResend(beneficiary.email);
            onClose?.();
          }}
        >
          Resend invitation
        </Button>
      )}
      <Button
        variant="secondary"
        size="lg"
        className="mt-3 h-14"
        onPress={() => {
          onClose?.();
          setTimeout(() => {
            useUiStore.getState().openSheet('guardian-lens', { beneficiary });
          }, 250);
        }}
      >
        Preview Beneficiary Access
      </Button>
      <Button
        variant="destructive"
        size="lg"
        className="mt-3 h-14"
        leftIcon={<Trash2 size={20} color={COLORS.textInverse} />}
        onPress={() => onRemove(beneficiary._id ?? '', beneficiary.name)}
      >
        Remove beneficiary
      </Button>
    </View>
  );
}
