import React, { useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
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
  testID?: string;
}

export function MotivationChoice({
  label,
  sublabel,
  icon,
  selected,
  onPress,
  disabled = false,
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
      className={`min-h-[44px] flex-row items-center gap-3 px-4 py-3.5 rounded-2xl border ${
        selected
          ? 'bg-brand/[0.06] border-brand'
          : 'bg-card border-stroke-weaker'
      }`}
    >
      {icon ? (
        <View className="w-8 h-8 rounded-full bg-fill-weak items-center justify-center">
          {icon}
        </View>
      ) : null}

      <View className="flex-1">
        <Text
          className={selected ? 'text-brand' : 'text-text-strong'}
          style={TYPE.buttonSmall}
        >
          {label}
        </Text>
        {sublabel ? (
          <Text className="text-text-weak mt-0.5" style={TYPE.bodySmall}>
            {sublabel}
          </Text>
        ) : null}
      </View>

      <View
        className={`size-5 rounded-full border-2 items-center justify-center shrink-0 ${
          selected ? 'bg-brand border-brand' : 'bg-transparent border-stroke-weak'
        }`}
      >
        {selected ? (
          <View className="size-2 rounded-full bg-white" />
        ) : null}
      </View>
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
      className={`min-h-[44px] flex-row items-center gap-2 px-4 py-2.5 rounded-full border ${
        selected
          ? 'bg-brand/[0.08] border-brand'
          : 'bg-card border-stroke-weaker'
      }`}
    >
      {icon}
      <Text
        className={selected ? 'text-brand' : 'text-text-strong'}
        style={TYPE.buttonSmall}
      >
        {label}
      </Text>
      {selected ? (
        <Check size={14} color={COLORS.brand} strokeWidth={2.5} />
      ) : null}
    </AnimatedPressable>
  );
}
