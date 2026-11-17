import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { useCallback } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { TYPE } from '@/constants/typography';
import { useVoicePressTarget } from '@/features/voice-control/hooks';

/** Web `.settings-grouped-list`: rows 4px apart, 4px inner corners, 20px outer corners. */
export const SETTINGS_GROUP_GAP = 4;
const INNER_RADIUS = 4;
const OUTER_RADIUS = 20;

interface SettingsHubRowProps {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  showChevron?: boolean;
  /** Round the top corners: the first row of a grouped list. */
  isFirst?: boolean;
  /** Round the bottom corners: the last row of a grouped list. */
  isLast?: boolean;
  disabled?: boolean;
  color?: string;
}

/** One row of the Settings hub, matching web `settings-card settings-row` (60px, 20px padding). */
export const SettingsHubRow = React.memo(function SettingsHubRow({
  label,
  icon,
  onPress,
  showChevron = true,
  isFirst = false,
  isLast = false,
  disabled = false,
  color,
}: SettingsHubRowProps) {
  const colors = useThemeColors();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // "Open personal information", "tap Security": every settings row is reachable by voice.
  useVoicePressTarget(label, onPress, !disabled);
  const handlePress = useCallback(() => {
    Haptics.selectionAsync();
    onPress();
  }, [onPress]);

  const top = isFirst ? OUTER_RADIUS : INNER_RADIUS;
  const bottom = isLast ? OUTER_RADIUS : INNER_RADIUS;

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={() => { scale.value = withSpring(0.98); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        disabled={disabled}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        style={{
          minHeight: 60,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          paddingHorizontal: 20,
          borderTopLeftRadius: top,
          borderTopRightRadius: top,
          borderBottomLeftRadius: bottom,
          borderBottomRightRadius: bottom,
          backgroundColor: colors.fillWeak,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          {icon}
          <Text
            numberOfLines={1}
            style={[TYPE.label, { flex: 1, color: color ?? colors.textStrong }]}
          >
            {label}
          </Text>
        </View>
        {showChevron && (
          <ChevronRight size={20} color={colors.textStrong} strokeWidth={1.75} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

/** Web `.settings-grouped-list`: a column of SettingsHubRows with 4px gaps. */
export function SettingsGroupedList({ children }: { children: React.ReactNode }) {
  return <View style={{ gap: SETTINGS_GROUP_GAP }}>{children}</View>;
}
