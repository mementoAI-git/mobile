import React, { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Avatar } from '@/components/ui';
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import {
  getBeneficiaryStatusBadge,
  getVaultAccessScopeLabel,
} from '@/features/beneficiaries/vault-permissions';
import type { IBeneficiary } from '@/types';

export const BeneficiaryPersonRow = memo(function BeneficiaryPersonRow({
  beneficiary,
  onPress,
}: {
  beneficiary: IBeneficiary;
  onPress: () => void;
}) {
  const picture = beneficiary.user?.picture_url;
  const badge = getBeneficiaryStatusBadge(beneficiary);
  const accessLabel = getVaultAccessScopeLabel((beneficiary as any).access_scope);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.76}
      className="min-h-[80px] flex-row items-center rounded-[24px] border border-stroke-weak bg-card px-5 py-4"
    >
      <Avatar uri={picture} name={beneficiary.name} size="lg" />
      <View className="ml-4 flex-1">
        <View className="flex-row items-center justify-between">
          <Text style={TYPE.cardTitle}>
            {beneficiary.name || 'Pending invitation'}
          </Text>
          <View
            style={{
              backgroundColor: badge.bgColor,
              borderColor: badge.borderColor,
              borderWidth: 1,
              borderRadius: 999,
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}
          >
            <Text
              style={{
                ...TYPE.eyebrow,
                color: badge.textColor,
                letterSpacing: 0.3,
              }}
            >
              {badge.label.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text numberOfLines={1} className="mt-0.5" style={TYPE.body}>
          {beneficiary.email}
        </Text>

        <View className="mt-1 flex-row items-center gap-2">
          <Text style={TYPE.bodySmall}>
            {beneficiary.relationship || 'Beneficiary'}
          </Text>
          <Text style={{ color: COLORS.textMuted }}>•</Text>
          <Text
            style={{
              ...TYPE.metadata,
              color: COLORS.textWeak,
            }}
          >
            {accessLabel}
          </Text>
        </View>
      </View>
      <ChevronRight size={24} color={COLORS.textBase} strokeWidth={2.2} />
    </TouchableOpacity>
  );
});
