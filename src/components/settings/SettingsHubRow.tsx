import React, { useCallback } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { iconSize, minTouchTarget, responsiveSpace } from '@/constants/responsive';
import { useVoicePressTarget } from '@/features/voice-control/hooks';

interface SettingsHubRowProps {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  showChevron?: Boolean;
}

export const SettingsHubRow = React.memo(function SettingsHubRow({
  label,
  icon,
  onPress,
  showChevron = true,
}: SettingsHubRowProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // "Open personal information", "tap Security": every settings row is reachable by voice.
  useVoicePressTarget(label, onPress, true);
  const handlePress = useCallback(() => {
    Haptics.selectionAsync();
    onPress();
  }, [onPress]);

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={() => { scale.value = withSpring(0.98); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        activeOpacity={1}
        accessibilityRole="button"
        style={{
          minHeight: minTouchTarget(64),
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: responsiveSpace(12),
          gap: responsiveSpace(12),
        }}
      >
        <View style={{ width: 32, alignItems: 'center' }}>{icon}</View>
        <Text
          style={[TYPE.body, { flex: 1 }]}
        >
          {label}
        </Text>
        {showChevron && (
          <ChevronRight size={iconSize(21)} color={COLORS.textBase} strokeWidth={2.2} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});
