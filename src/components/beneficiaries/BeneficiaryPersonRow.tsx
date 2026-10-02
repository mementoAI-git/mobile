import React, { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Avatar } from '@/components/ui';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { iconSize, minTouchTarget, radius, responsiveSpace } from '@/constants/responsive';
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
      style={{
        minHeight: minTouchTarget(80),
        borderRadius: radius(24),
        paddingHorizontal: responsiveSpace(20),
        paddingVertical: responsiveSpace(16),
      }}
      className="flex-row items-center bg-card"
    >
      <Avatar uri={picture} name={beneficiary.name} size="lg" />
      <View className="ml-4 flex-1">
        <View className="flex-row items-center justify-between">
          <Text style={{ ...TYPE.body, color: COLORS.textStrong }} numberOfLines={1}>
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

        <Text numberOfLines={1} style={{ ...TYPE.bodySmall, color: COLORS.textWeak, marginTop: 2 }}>
          {beneficiary.email}
        </Text>

        <View className="mt-1.5 flex-row items-center gap-2">
          <Text style={{ ...TYPE.metadata, color: COLORS.textMuted }}>
            {beneficiary.relationship || 'Beneficiary'}
          </Text>
          <Text style={{ color: COLORS.textMuted }}>•</Text>
          <Text
            style={{
              ...TYPE.metadata,
              color: COLORS.textMuted,
            }}
          >
            {accessLabel}
          </Text>
        </View>
      </View>
      <ChevronRight size={iconSize(20)} color={COLORS.textWeak} strokeWidth={2} />
    </TouchableOpacity>
  );
});
