import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { memo } from 'react';
import { Text, View } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { TYPE } from '@/constants/typography';
import { groupCardDetails } from '@/features/beneficiaries/people-cards';
import { GROUP_COLOR_PALETTE } from '@/features/beneficiaries/sheet-forms';
import type { IGroup } from '@/types';

/** A group on People & groups, as the web groups list: colour swatch, name, created date and count. */
export const BeneficiaryGroupRow = memo(function BeneficiaryGroupRow({
  group,
  onPress,
}: {
  group: IGroup;
  onPress: () => void;
}) {
  const COLORS = useThemeColors();
  const color = GROUP_COLOR_PALETTE[group.color ?? 1]?.color ?? COLORS.info;
  const details = groupCardDetails(group);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.76}
      accessibilityRole="button"
      accessibilityLabel={`${group.name || 'Untitled group'}, ${details.join(', ')}`}
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16, padding: 16, borderRadius: 20, backgroundColor: COLORS.settingsCard }}
    >
      <View style={{ width: 24, height: 24, borderRadius: 6, marginTop: 2, backgroundColor: color }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ ...TYPE.profileName, color: COLORS.textStrong }}>
          {group.name || 'Untitled group'}
        </Text>
        <View style={{ marginTop: 2, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8 }}>
          {details.map((detail, index) => (
            <View key={detail} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {index > 0 ? <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.textWeak }} /> : null}
              <Text style={{ ...TYPE.bodySmall, color: COLORS.textWeak }}>{detail}</Text>
            </View>
          ))}
        </View>
      </View>
      <ChevronRight size={20} color={COLORS.textStrong} strokeWidth={1.75} style={{ marginTop: 4 }} />
    </TouchableOpacity>
  );
});
