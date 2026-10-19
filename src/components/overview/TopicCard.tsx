import React, { useCallback } from 'react';
import { View, Image, Text, type ImageSourcePropType } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import * as Haptics from 'expo-haptics';
import { TYPE } from '@/constants/typography';
import { cn } from '@/lib/utils';
import Animated, { useSharedValue, useAnimatedStyle, useReducedMotion, withSpring } from 'react-native-reanimated';

interface TopicCardProps {
  title: string;
  image?: ImageSourcePropType;
  category?: string;
  description?: string;
  fullWidth?: boolean;
  imageHeight?: number;
  onPress?: () => void;
  className?: string;
}

export const TopicCard = React.memo(function TopicCard({ title, image, category, description, fullWidth = false, imageHeight = 140, onPress, className }: TopicCardProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const handlePressIn = useCallback(() => {
    if (!reducedMotion) scale.value = withSpring(0.97);
  }, [reducedMotion, scale]);
  const handlePressOut = useCallback(() => { scale.value = withSpring(1); }, [scale]);
  const handlePress = useCallback(() => {
    Haptics.selectionAsync();
    onPress?.();
  }, [onPress]);

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel={`${category ? `${category}: ` : ''}${title}`}
        activeOpacity={0.9}
        className={cn('gap-4 rounded-[24px] border border-stroke-weak bg-card p-3', className)}
        style={{ width: fullWidth ? '100%' : 240 }}
      >
        <View className="w-full overflow-hidden rounded-xl bg-fill-weak" style={{ height: imageHeight }}>
          {image && <Image source={image} className="w-full h-full" resizeMode="cover" accessibilityElementsHidden />}
          {category ? (
            <View className="absolute top-2.5 left-2.5 right-2.5 items-start">
              <View className="rounded-full bg-card px-2.5 py-1.5">
                <Text className="text-text-strong" style={TYPE.metadata}>{category}</Text>
              </View>
            </View>
          ) : null}

        </View>
        <View className="px-1 pb-1 gap-2">
          <Text className="text-text-strong" style={TYPE.cardTitle} numberOfLines={fullWidth ? undefined : 3}>{title}</Text>
          {description ? <Text className="text-text-base" style={TYPE.body}>{description}</Text> : null}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});
