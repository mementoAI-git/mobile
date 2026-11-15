import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import { Pressable } from '@/components/ui/Touchable';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface MotivationChoiceProps {
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  selected: boolean;
  onPress: () => boolean | void;
  disabled?: boolean;
  hideRadio?: boolean;
  testID?: string;
}

export function MotivationChoice({
  label,
  sublabel,
  icon,
  selected,
  onPress,
  disabled = false,
  hideRadio = false,
  testID,
}: MotivationChoiceProps) {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    if (disabled) return;
    scale.value = withSpring(0.98);
  }, [disabled, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1);
  }, [scale]);

  const handlePress = useCallback(() => {
    if (disabled) return;
    const accepted = onPress();
    if (accepted === false) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.selectionAsync();
  }, [disabled, onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      testID={testID}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={label}
      style={animatedStyle}
      // Figma "What brings you to Memento" option: 8px radius, 16/14 padding, 24px icon, 14/20 text.
      className={`min-h-[44px] flex-row items-center gap-3 px-4 py-3.5 rounded-lg border ${
        selected
          ? 'bg-brand/[0.06] border-brand/80'
          : 'bg-card border-stroke-weak'
      }`}
    >
      {icon ? (
        <View className="size-6 items-center justify-center shrink-0">
          {icon}
        </View>
      ) : null}

      <View className="flex-1">
        <Text
          className="text-text-strong"
          style={TYPE.bodySmall}
        >
          {label}
        </Text>
        {sublabel ? (
          <Text className="text-text-weak mt-0.5" style={TYPE.bodySmall}>
            {sublabel}
          </Text>
        ) : null}
      </View>

      {!hideRadio && (
        <View
          className={`size-5 rounded-full border-2 items-center justify-center shrink-0 ${
            selected ? 'bg-brand border-brand' : 'bg-transparent border-stroke-weak'
          }`}
        >
          {selected ? (
            <View className="size-2 rounded-full bg-white" />
          ) : null}
        </View>
      )}
    </AnimatedPressable>
  );
}

export interface LifeAreaChoiceProps {
  label: string;
  icon?: React.ReactNode;
  selected: boolean;
  onPress: () => boolean | void;
  disabled?: boolean;
  testID?: string;
}

export function LifeAreaChoice({
  label,
  icon,
  selected,
  onPress,
  disabled = false,
  testID,
}: LifeAreaChoiceProps) {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    if (disabled) return;
    scale.value = withSpring(0.98);
  }, [disabled, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1);
  }, [scale]);

  const handlePress = useCallback(() => {
    if (disabled) return;
    const accepted = onPress();
    if (accepted === false) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.selectionAsync();
  }, [disabled, onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      testID={testID}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={label}
      style={animatedStyle}
      hitSlop={{ top: 2, bottom: 2 }}
      // Figma life-area chip: 16/11 padding, 16px icon, 12/16 text; selected uses the brand-strong stroke.
      className={`flex-row items-center gap-2 px-4 rounded-full border bg-card ${
        selected ? 'border-brand/80' : 'border-stroke-weak'
      }`}
    >
      {icon}
      <Text
        className="text-text-strong"
        style={[TYPE.chipLabel, { paddingVertical: 11 }]}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}
