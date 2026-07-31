import React, { useCallback } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/tokens';
import { SETTINGS_TYPE } from '@/components/settings/settings-typography';

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
          minHeight: 64,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          gap: 12,
        }}
      >
        <View style={{ width: 32, alignItems: 'center' }}>{icon}</View>
        <Text
          style={[SETTINGS_TYPE.rowLabel, { flex: 1 }]}
        >
          {label}
        </Text>
        {showChevron && (
          <ChevronRight size={21} color={COLORS.textBase} strokeWidth={2.2} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});
