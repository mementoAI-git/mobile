import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS } from '@/constants/tokens';
import { cn } from '@/lib/utils';
import Animated from 'react-native-reanimated';

interface TopicCardProps {
  title: string;
  image: any;
  onPress?: () => void;
  className?: string;
}

export function TopicCard({ title, image, onPress, className }: TopicCardProps) {
  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.selectionAsync();
        onPress?.();
      }}
      activeOpacity={0.7}
      className={cn('gap-3', className)}
      style={{ width: 220 }}
    >
      <View className="w-full h-32 rounded-[24px] overflow-hidden bg-fill-weak border border-stroke-weaker">
        <Image
          source={image}
          className="w-full h-full"
          resizeMode="cover"
        />
      </View>
      <View className="gap-1 px-1">
        <Animated.Text
          className="text-lg text-text-strong leading-tight"
          style={{ fontFamily: FONTS.serif }}
          numberOfLines={2}
        >
          {title}
        </Animated.Text>
      </View>
    </TouchableOpacity>
  );
}
