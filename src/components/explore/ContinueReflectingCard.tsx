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
import { reflectionCardWidth } from '@/features/prompts/reflection-card-size';
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

/** Prompt lines that fit the fixed card height above the footer. */
export const REFLECTION_CARD_LINES = 4;

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
  const disabled = !onPress;
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
        accessibilityHint={answered ? 'Answered today. Opens this reflection' : 'Opens this reflection'}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={reducedMotion ? 1 : 0.9}
        // Web mobile overview: w-[min(78vw,320px)] h-[267px] gap-10 rounded-3xl p-[23px].
        // Fixed height so every card in the row matches; long prompts are truncated
        // (the full text is on the reflection page).
        style={{ width: reflectionCardWidth(width), padding: 23 }}
        className={cn('h-[267px] justify-between gap-10 overflow-hidden rounded-[24px] border border-stroke-weak bg-fill-weaker', className)}
      >
        <Text className="text-text-strong" style={[TYPE.reflectionTitle, { flexShrink: 1 }]} numberOfLines={REFLECTION_CARD_LINES} ellipsizeMode="tail">
          {accent ? (
            <>
              {title.slice(0, accent.start)}
              <Text className="text-brand" style={TYPE.reflectionTitleAccent}>{title.slice(accent.start, accent.end)}</Text>
              {title.slice(accent.end)}
            </>
          ) : title}
        </Text>

        {answered ? (
          <View className="flex-row items-center gap-1.5">
            <Check size={ms(16)} color={COLORS.success} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
            <Text style={[TYPE.label, { color: COLORS.textWeak, flex: 1 }]}>
              You’ve already shared a reflection for this one today.
            </Text>
          </View>
        ) : (
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-row items-center gap-1 rounded-full bg-fill-weak shrink min-w-0" style={{ paddingHorizontal: 7, paddingVertical: 2 }}>
              <View
                className="rounded-full"
                style={{ width: 9, height: 9, backgroundColor: categoryLabel.toLowerCase() === 'people i love' ? COLORS.success : COLORS.warning }}
              />
              <Text numberOfLines={1} className="text-text-strong shrink" style={TYPE.label}>
                {categoryLabel}
              </Text>
            </View>
            {personal ? (
              <Text className="text-text-weak" style={TYPE.label}>For you</Text>
            ) : (
              <View className="flex-row items-center gap-2 shrink-0">
                <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="flex-row pl-2.5">
                  {avatars.map((source, index) => (
                    <Image
                      key={index}
                      source={source}
                      style={{ width: 24, height: 24 }}
                      className="-ml-2.5 rounded-full border border-stroke-weak"
                    />
                  ))}
                </View>
                {hasReplyCount && (
                  <Text className="text-text-weak" style={TYPE.label}>{replyCount.toLocaleString('en-US')} people</Text>
                )}
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});
