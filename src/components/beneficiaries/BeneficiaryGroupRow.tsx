import React, { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { COLORS, FONTS } from '@/constants/tokens';
import { SETTINGS_TYPE } from '@/components/settings/settings-typography';
import { getGroupMemberCount } from '@/features/beneficiaries/collections';
import { GROUP_COLOR_PALETTE } from '@/features/beneficiaries/sheet-forms';
import type { IGroup } from '@/types';

export const BeneficiaryGroupRow = memo(function BeneficiaryGroupRow({
  group,
  index,
  onPress,
}: {
  group: IGroup;
  index: number;
  onPress: () => void;
}) {
  const count = getGroupMemberCount(group);
  const color = GROUP_COLOR_PALETTE[group.color ?? 1]?.color ?? COLORS.info;
  const created = group.created_at
    ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(group.created_at))
    : null;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.76}
      className="min-h-[80px] flex-row items-center rounded-[24px] border border-stroke-weak bg-card px-5 py-4"
    >
      <View className="flex-1">
        <View className="flex-row items-center">
          <View className="mr-2.5 size-3 rounded-[4px]" style={{ backgroundColor: color }} />
          <Text style={SETTINGS_TYPE.identityTitle}>
            {group.name}
          </Text>
        </View>
        {created && (
          <Text className="mt-1" style={SETTINGS_TYPE.supporting}>
            Created {created}
          </Text>
        )}
      </View>
      <Text className="mr-5" style={SETTINGS_TYPE.rowLabel}>
        {count} {count === 1 ? 'Person' : 'People'}
      </Text>
      <ChevronRight size={24} color={COLORS.textBase} strokeWidth={2.2} />
    </TouchableOpacity>
  );
});
