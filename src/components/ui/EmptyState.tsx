import { useThemeColors } from '@/hooks/use-theme-colors';
import React from 'react';
import { View, Image, ImageSourcePropType } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import Animated from 'react-native-reanimated';
import { cn } from '@/lib/utils';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import type { LucideIcon } from 'lucide-react-native';
import { iconSize, minTouchTarget, ms, responsiveSpace } from '@/constants/responsive';

interface EmptyStateProps {
  title: string;
  description: string;
  image?: ImageSourcePropType;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title,
  description,
  image,
  icon: Icon,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  const COLORS = useThemeColors();
  const artworkSize = ms(240, 0.2);

  return (
    <View className={cn('flex-1 items-center justify-center px-8 py-12', className)}>
      {image ? (
        <Image
          source={image}
          style={{ width: artworkSize, height: artworkSize, marginBottom: responsiveSpace(24) }}
          resizeMode="contain"
        />
      ) : Icon ? (
        <View
          className="rounded-full bg-fill-weaker items-center justify-center"
          style={{
            padding: responsiveSpace(24),
            marginBottom: responsiveSpace(24),
          }}
        >
          <Icon size={iconSize(48)} color={COLORS.textDisabled} strokeWidth={1.5} />
        </View>
      ) : null}

      <Animated.Text
        className="text-text-strong text-center"
        style={[TYPE.cardTitle, { marginBottom: responsiveSpace(8) }]}
      >
        {title}
      </Animated.Text>

      <Animated.Text
        className="text-text-weak text-center"
        style={[TYPE.bodySmall, { marginBottom: responsiveSpace(32) }]}
      >
        {description}
      </Animated.Text>

      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.8}
          className="bg-brand rounded-full shadow-sm items-center justify-center"
          style={{
            minHeight: minTouchTarget(44),
            paddingHorizontal: responsiveSpace(32),
            paddingVertical: responsiveSpace(14),
          }}
        >
          <Animated.Text className="text-white" style={TYPE.button}>
            {actionLabel}
          </Animated.Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
