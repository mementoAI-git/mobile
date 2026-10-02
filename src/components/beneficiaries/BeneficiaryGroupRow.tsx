import React, { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { iconSize, minTouchTarget, radius, responsiveSpace } from '@/constants/responsive';
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
      style={{
        minHeight: minTouchTarget(80),
        borderRadius: radius(24),
        paddingHorizontal: responsiveSpace(20),
        paddingVertical: responsiveSpace(16),
      }}
      className="flex-row items-center bg-card"
    >
      <View className="flex-1">
        <View className="flex-row items-center">
          <View className="mr-2.5 size-3 rounded-[4px]" style={{ backgroundColor: color }} />
          <Text style={{ ...TYPE.body, color: COLORS.textStrong }} numberOfLines={1}>
            {group.name}
          </Text>
        </View>
        {created && (
          <Text style={{ ...TYPE.bodySmall, color: COLORS.textWeak, marginTop: 2 }}>
            Created {created}
          </Text>
        )}
      </View>
      <Text className="mr-3" style={{ ...TYPE.bodySmall, color: COLORS.textWeak }}>
        {count} {count === 1 ? 'Person' : 'People'}
      </Text>
      <ChevronRight size={iconSize(20)} color={COLORS.textWeak} strokeWidth={2} />
    </TouchableOpacity>
  );
});
