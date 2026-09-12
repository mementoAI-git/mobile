import React from 'react';
import { View, Image, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { cn } from '@/lib/utils';
import { ArrowUpRight } from 'lucide-react-native';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';

const QUESTION_ICON = require('../../../assets/images/question-2.png');

interface ContinueReflectingCardProps {
  title: string;
  onPress?: () => void;
  className?: string;
}

export function ContinueReflectingCard({ title, onPress, className }: ContinueReflectingCardProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => { if (onPress) scale.value = withSpring(0.97); };
  const handlePressOut = () => { if (onPress) scale.value = withSpring(1); };

  return (
    <Animated.View style={[animStyle]}>
      <TouchableOpacity
        onPress={() => {
          Haptics.selectionAsync();
          onPress?.();
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        className={cn(
          'flex-row items-center rounded-2xl bg-white border border-stroke-weaker p-4 mr-4 w-[280px] h-[100px]',
          className
        )}
      >
        {/* Left icon container */}
        <View className="size-14 items-center justify-center mr-3 bg-fill-weaker rounded-xl shrink-0">
          <Image
            source={QUESTION_ICON}
            className="size-10"
            resizeMode="contain"
          />
        </View>

        {/* Text content */}
        <View className="flex-1 justify-between gap-2">
          <Animated.Text
            numberOfLines={2}
            className="text-text-strong"
            style={TYPE.cardTitle}
          >
            {title}
          </Animated.Text>
          <View className="flex-row items-center gap-1">
            <Animated.Text
              className="text-text-weak"
              style={TYPE.metadata}
            >
              Continue
            </Animated.Text>
            <ArrowUpRight size={14} color={COLORS.textWeak} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
