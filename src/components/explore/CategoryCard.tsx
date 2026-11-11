import React, { useCallback } from 'react';
import { Image, Text, View, type ImageSourcePropType } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { TYPE } from '@/constants/typography';
import { useThemeColors } from '@/hooks/use-theme-colors';

const IMAGE_SIZE = 128;

interface CategoryCardProps {
  title: string;
  subtitle?: string;
  image?: ImageSourcePropType;
  /** Number of starter questions, shown under the description. */
  questionCount?: number;
  onPress?: () => void;
}

/**
 * Editorial Topics row: title, short description and question count on the left,
 * a square cover on the right, separated from the next row by a hairline.
 */
export const CategoryCard = React.memo(function CategoryCard({
  title, subtitle, image, questionCount, onPress,
}: CategoryCardProps) {
  const colors = useThemeColors();
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const handlePressIn = useCallback(() => {
    if (!reducedMotion) scale.value = withSpring(0.98);
  }, [reducedMotion, scale]);
  const handlePressOut = useCallback(() => { scale.value = withSpring(1); }, [scale]);
  const handlePress = useCallback(() => {
    void Haptics.selectionAsync();
    onPress?.();
  }, [onPress]);
  const countLabel = questionCount ? `${questionCount} ${questionCount === 1 ? 'question' : 'questions'}` : '';

  return (
    <Animated.View style={[animStyle, { borderTopWidth: 1, borderTopColor: colors.strokeWeak }]}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={[title, subtitle, countLabel].filter(Boolean).join('. ')}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16 }}
      >
        <View style={{ flex: 1, gap: 6 }}>
          <Text numberOfLines={3} style={[TYPE.bodyLargeSemi, { color: colors.textStrong }]}>{title}</Text>
          {subtitle ? (
            <Text numberOfLines={3} style={[TYPE.bodySmall, { color: colors.textWeak }]}>{subtitle}</Text>
          ) : null}
          {countLabel ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <MessageCircle size={14} color={colors.textWeak} strokeWidth={2} />
              <Text style={[TYPE.metadata, { color: colors.textWeak }]}>{countLabel}</Text>
            </View>
          ) : null}
        </View>
        <View style={{ width: IMAGE_SIZE, height: IMAGE_SIZE, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.fillWeak }}>
          {image ? (
            <Image source={image} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityElementsHidden />
          ) : null}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});
