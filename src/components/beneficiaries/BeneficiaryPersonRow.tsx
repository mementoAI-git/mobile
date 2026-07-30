import React, { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Avatar } from '@/components/ui';
import { COLORS, FONTS } from '@/constants/tokens';
import { SETTINGS_TYPE } from '@/components/settings/settings-typography';
import type { IBeneficiary } from '@/types';

export const BeneficiaryPersonRow = memo(function BeneficiaryPersonRow({
  beneficiary,
  onPress,
}: {
  beneficiary: IBeneficiary;
  onPress: () => void;
}) {
  const picture = beneficiary.user?.picture_url;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.76}
      className="min-h-[80px] flex-row items-center rounded-[24px] border border-stroke-weak bg-card px-5 py-4"
    >
      <Avatar uri={picture} name={beneficiary.name} size="lg" />
      <View className="ml-4 flex-1">
        <Text style={SETTINGS_TYPE.identityTitle}>
          {beneficiary.name || 'Pending invitation'}
        </Text>
        <Text numberOfLines={1} className="mt-0.5" style={SETTINGS_TYPE.body}>
          {beneficiary.email}
        </Text>
        <Text className="mt-0.5" style={SETTINGS_TYPE.supporting}>
          {beneficiary.relationship || (beneficiary.status === 'pending' ? 'Invitation pending' : 'Beneficiary')}
        </Text>
      </View>
      <ChevronRight size={24} color={COLORS.textBase} strokeWidth={2.2} />
    </TouchableOpacity>
  );
});
