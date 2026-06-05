import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Layers, X } from 'lucide-react-native';
import { FONTS, COLORS } from '@/constants/tokens';

interface DeepDiveBannerProps {
  dimensionLabel: string;
  onExit: () => void;
}

/**
 * DeepDiveBanner — mirrors web's DeepDiveBanner component.
 * Shown in the chat header toolbar while chatMode === 'deep_dive'.
 * Displays which dimension is active and provides a one-tap exit.
 */
export function DeepDiveBanner({ dimensionLabel, onExit }: DeepDiveBannerProps) {
  return (
    <Animated.View entering={FadeInDown.duration(250)}>
      <View className="flex-row items-center gap-2 bg-brand/10 border border-brand/20 rounded-full px-3 py-1.5">
        <Layers size={13} color={COLORS.brand} strokeWidth={2.5} />
        <Text
          style={{ fontFamily: FONTS.sansSemi, fontSize: 12, color: COLORS.brand }}
          numberOfLines={1}
        >
          Deep dive · {dimensionLabel}
        </Text>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onExit();
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={12} color={COLORS.brand} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
