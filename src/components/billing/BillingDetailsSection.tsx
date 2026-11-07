import { useThemeColors } from '@/hooks/use-theme-colors';
import React from 'react';
import { Text, View } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import FileText from 'lucide-react-native/icons/file-text';
import Pencil from 'lucide-react-native/icons/pencil';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { iconSize, minTouchTarget, radius, responsiveSpace } from '@/constants/responsive';
import type { BillingProfile } from '@/features/settings/billing-adapters';

export const BillingDetailsSection = React.memo(function BillingDetailsSection({profile, onEdit}: {profile: BillingProfile; onEdit: () => void}) {
  const COLORS = useThemeColors();
  const address = profile.address;
  const addressLines = address ? [address.line1, address.line2, [address.city, address.state, address.postalCode].filter(Boolean).join(', '), address.country].filter(Boolean) : [];
  
  return (
    <View className="rounded-[24px] pt-1 pb-2">
      {/* Header row */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2.5">
          <FileText size={iconSize(18)} color={COLORS.textStrong} strokeWidth={2} />
          <Text style={{ ...TYPE.bodyStrong, color: COLORS.textStrong }}>
            Billing details
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Edit billing details"
          activeOpacity={0.75}
          onPress={() => {
            Haptics.selectionAsync();
            onEdit();
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            minHeight: minTouchTarget(36),
            minWidth: minTouchTarget(44),
            paddingHorizontal: responsiveSpace(14),
            borderRadius: radius(10),
            borderWidth: 1,
            borderColor: COLORS.strokeWeak,
            backgroundColor: COLORS.card,
          }}
        >
          <Pencil size={iconSize(14)} color={COLORS.textStrong} strokeWidth={2} />
          <Text style={{ ...TYPE.buttonSmall, color: COLORS.textStrong }}>
            Edit
          </Text>
        </TouchableOpacity>
      </View>

      {/* Field values */}
      <View className="mt-5">
        <View>
          <Text style={{ ...TYPE.bodySmall, color: COLORS.textWeak }}>
            Billing email
          </Text>
          <Text style={{ ...TYPE.body, color: profile.email ? COLORS.textStrong : COLORS.textMuted, marginTop: 4 }}>
            {profile.email ?? '—'}
          </Text>
        </View>

        <View style={{ marginTop: 18 }}>
          <Text style={{ ...TYPE.bodySmall, color: COLORS.textWeak }}>
            Name
          </Text>
          <Text style={{ ...TYPE.body, color: profile.name ? COLORS.textStrong : COLORS.textMuted, marginTop: 4 }}>
            {profile.name ?? '—'}
          </Text>
        </View>

        <View style={{ marginTop: 18 }}>
          <Text style={{ ...TYPE.bodySmall, color: COLORS.textWeak }}>
            Address
          </Text>
          <Text style={{ ...TYPE.body, color: addressLines.length ? COLORS.textStrong : COLORS.textMuted, marginTop: 4, lineHeight: 23 }}>
            {addressLines.length ? addressLines.join('\n') : '—'}
          </Text>
        </View>
      </View>
    </View>
  );
});
