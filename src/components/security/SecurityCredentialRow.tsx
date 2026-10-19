import { useThemeColors } from '@/hooks/use-theme-colors';
import React from 'react';
import { Text, View } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import Trash2 from 'lucide-react-native/icons/trash';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { iconSize, minTouchTarget, radius, responsiveSpace } from '@/constants/responsive';

interface SecurityCredentialRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string | null;
  onDelete?: () => void;
}

export const SecurityCredentialRow = React.memo(function SecurityCredentialRow({
  icon,
  title,
  subtitle,
  onDelete,
}: SecurityCredentialRowProps) {
  const COLORS = useThemeColors();
  return (
    <View
      style={{
        minHeight: minTouchTarget(64),
        borderRadius: radius(16),
        paddingHorizontal: responsiveSpace(16),
        paddingVertical: responsiveSpace(12),
        flexDirection: 'row',
        alignItems: 'center',
        gap: responsiveSpace(12),
        backgroundColor: COLORS.fillWeaker,
      }}
    >
      {icon}
      <View style={{ flex: 1 }}>
        <Text
          style={{ ...TYPE.body, color: COLORS.textStrong }}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={{ ...TYPE.bodySmall, color: COLORS.textWeak, marginTop: 2 }}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {onDelete && (
        <TouchableOpacity
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${title}`}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            minWidth: minTouchTarget(36),
            minHeight: minTouchTarget(36),
            borderRadius: radius(18),
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: `${COLORS.error}10`,
          }}
        >
          <Trash2 size={iconSize(18)} color={COLORS.error} />
        </TouchableOpacity>
      )}
    </View>
  );
});
