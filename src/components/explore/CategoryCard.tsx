import React from 'react';
import { View, Image, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react-native';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { iconSize } from '@/constants/responsive';

interface CategoryCardProps {
  title: string;
  subtitle?: string;
  image?: any;
  progressLabel?: string;
  isComplete?: boolean;
  onPress?: () => void;
  className?: string;
}

export const CategoryCard = React.memo(function CategoryCard({
  title,
  subtitle,
  image,
  progressLabel,
  isComplete,
  onPress,
  className,
}: CategoryCardProps) {
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
        className={cn('w-full rounded-[32px] overflow-hidden bg-white mb-5 border border-stroke-weaker', className)}
      >
        {image && (
          <View className="w-full h-52 bg-fill-weak relative">
            <Image
              source={image}
              className="w-full h-full"
              resizeMode="cover"
            />
            <View className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </View>
        )}
        <View className="p-7 gap-3">
          <View className="flex-row items-center justify-between">
            <Animated.Text
              className="text-text-strong flex-1"
              style={TYPE.screenTitle}
            >
              {title}
            </Animated.Text>
            <View className="size-10 rounded-full bg-fill-weaker border border-stroke-weaker items-center justify-center">
              <ChevronRight size={iconSize(18)} color={COLORS.textBase} />
            </View>
          </View>
          {subtitle && (
            <Animated.Text
              className="text-text-base opacity-80"
              style={TYPE.body}
            >
              {subtitle}
            </Animated.Text>
          )}
          {progressLabel ? (
            <View
              style={{
                alignSelf: 'flex-start',
                backgroundColor: isComplete ? 'rgba(6, 122, 87, 0.08)' : COLORS.fillWeaker,
                borderColor: isComplete ? 'rgba(6, 122, 87, 0.2)' : COLORS.strokeWeak,
                borderWidth: 1,
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 4,
                marginTop: 2,
              }}
            >
              <Animated.Text
                style={{
                  ...TYPE.metadata,
                  color: isComplete ? COLORS.success : COLORS.textWeak,
                  letterSpacing: 0.5,
                }}
              >
                {progressLabel.toUpperCase()}
              </Animated.Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});
