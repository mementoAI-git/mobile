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
  description?: string;
  image?: ImageSourcePropType;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  /** `inverse` is the theme's selected fill: white in dark, ink in light. */
  actionTone?: 'brand' | 'inverse';
  className?: string;
}

export function EmptyState({
  title,
  description,
  image,
  icon: Icon,
  actionLabel,
  onAction,
  actionTone = 'brand',
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
          className="rounded-full bg-fill-weak items-center justify-center"
          style={{
            padding: responsiveSpace(20),
            marginBottom: responsiveSpace(20),
          }}
        >
          <Icon size={iconSize(32)} color={COLORS.textWeak} strokeWidth={1.8} />
        </View>
      ) : null}

      <Animated.Text
        className="text-text-strong text-center"
        style={[TYPE.cardTitle, { marginBottom: responsiveSpace(description ? 8 : 24) }]}
      >
        {title}
      </Animated.Text>

      {description ? (
        <Animated.Text
          className="text-text-weak text-center"
          style={[TYPE.bodySmall, { marginBottom: responsiveSpace(32) }]}
        >
          {description}
        </Animated.Text>
      ) : null}

      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.8}
          accessibilityRole="button"
          className={cn('rounded-full items-center justify-center', actionTone === 'brand' && 'bg-brand shadow-sm')}
          style={{
            backgroundColor: actionTone === 'inverse' ? COLORS.activeFill : undefined,
            minHeight: minTouchTarget(44),
            paddingHorizontal: responsiveSpace(32),
            paddingVertical: responsiveSpace(14),
          }}
        >
          <Animated.Text style={[TYPE.button, { color: actionTone === 'inverse' ? COLORS.activeText : COLORS.textInverse }]}>
            {actionLabel}
          </Animated.Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
