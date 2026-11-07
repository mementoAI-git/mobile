import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { useCallback } from 'react';
import { View, Text, Image, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import * as Haptics from 'expo-haptics';
import Check from 'lucide-react-native/icons/check';
import Animated, { useSharedValue, useAnimatedStyle, useReducedMotion, withSpring } from 'react-native-reanimated';
import { cn } from '@/lib/utils';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { ms } from '@/constants/responsive';
import { getPromptAccent } from '@/features/prompts/prompt-accent';

interface ContinueReflectingCardProps {
  title: string;
  categoryLabel?: string;
  personal?: boolean;
  answered?: boolean;
  replyCount?: number;
  avatars?: ImageSourcePropType[];
  onPress?: () => void;
  className?: string;
}

export const ContinueReflectingCard = React.memo(function ContinueReflectingCard({
  title,
  categoryLabel = 'Who I am',
  personal = false,
  answered = false,
  replyCount,
  avatars = [],
  onPress,
  className,
}: ContinueReflectingCardProps) {
  const COLORS = useThemeColors();
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const accent = getPromptAccent(title);
  const disabled = answered || !onPress;
  const hasReplyCount = typeof replyCount === 'number' && Number.isSafeInteger(replyCount) && replyCount >= 0;

  const handlePressIn = useCallback(() => {
    if (!disabled && !reducedMotion) scale.value = withSpring(0.97);
  }, [disabled, reducedMotion, scale]);
  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1);
  }, [scale]);
  const handlePress = useCallback(() => {
    if (disabled) return;
    Haptics.selectionAsync();
    onPress?.();
  }, [disabled, onPress]);

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={answered ? 'Answered' : 'Open this reflection'}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={reducedMotion ? 1 : 0.9}
        style={{ width: Math.min(300, width - 64) }}
        className={cn('min-h-[220px] justify-between gap-8 rounded-[24px] border border-stroke-weak bg-fill-weaker p-5 mr-4', className)}
      >
        <Text className="text-text-strong" style={TYPE.cardTitle}>
          {accent ? (
            <>
              {title.slice(0, accent.start)}
              <Text className="text-brand italic">{title.slice(accent.start, accent.end)}</Text>
              {title.slice(accent.end)}
            </>
          ) : title}
        </Text>

        {answered ? (
          <View className="flex-row items-center gap-1.5">
            <Check size={ms(16)} color={COLORS.success} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
            <Text style={[TYPE.bodySmall, { color: COLORS.textWeak, flex: 1 }]}>
              You’ve already shared a reflection for this one today.
            </Text>
          </View>
        ) : (
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-row items-center gap-1 rounded-full bg-fill-weak px-2 py-1 shrink min-w-0">
              <View
                className="size-2 rounded-full"
                style={{ backgroundColor: categoryLabel.toLowerCase() === 'people i love' ? COLORS.success : COLORS.warning }}
              />
              <Text numberOfLines={1} className="text-text-strong shrink" style={TYPE.metadata}>
                {categoryLabel}
              </Text>
            </View>
            {personal ? (
              <Text className="text-text-base" style={TYPE.metadata}>For you</Text>
            ) : (
              <View className="flex-row items-center gap-1.5 shrink-0">
                <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="flex-row pl-2.5">
                  {avatars.map((source, index) => (
                    <Image
                      key={index}
                      source={source}
                      style={{ width: ms(20), height: ms(20) }}
                      className="-ml-2.5 rounded-full border border-stroke-weak"
                    />
                  ))}
                </View>
                {hasReplyCount && (
                  <Text className="text-text-base" style={TYPE.metadata}>{replyCount.toLocaleString('en-US')} people</Text>
                )}
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});
