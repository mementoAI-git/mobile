import React from 'react';
import { Pressable, Text, ActivityIndicator, View, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { cn } from '@/lib/utils';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { minTouchTarget, mvs, responsiveSpace } from '@/constants/responsive';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'black';
type Size = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps {
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  size?: Size;
  rounded?: 'full' | 'xl' | 'lg' | '2xl';
  className?: string;
  textClassName?: string;
  children: React.ReactNode;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  accessibilityLabel?: string;
}

// Mirrors web button.tsx variants exactly
const variantStyles: Record<Variant, { container: string; text: string }> = {
  primary: {
    container: 'bg-brand shadow-btn',
    text: 'text-white',
  },
  secondary: {
    container: 'bg-fill-weak',
    text: 'text-text-strong',
  },
  outline: {
    container: 'border border-stroke-weak bg-fill-weaker',
    text: 'text-text-strong',
  },
  ghost: {
    container: 'bg-transparent',
    text: 'text-text-base',
  },
  destructive: {
    container: 'bg-error-strong',
    text: 'text-white',
  },
  black: {
    container: 'bg-black',
    text: 'text-white',
  },
};

const sizeMetrics: Record<
  Size,
  {
    minHeight: number;
    paddingHorizontal: number;
    gap: number;
    hitSlop?: { top: number; bottom: number; left: number; right: number };
  }
> = {
  xs: {
    minHeight: mvs(24, 0.25),
    paddingHorizontal: responsiveSpace(10),
    gap: responsiveSpace(4),
    hitSlop: {
      top: Math.max(0, Math.round((44 - mvs(24, 0.25)) / 2)),
      bottom: Math.max(0, Math.round((44 - mvs(24, 0.25)) / 2)),
      left: Math.max(0, Math.round((44 - responsiveSpace(10) * 2) / 2)),
      right: Math.max(0, Math.round((44 - responsiveSpace(10) * 2) / 2)),
    },
  },
  sm: {
    minHeight: mvs(32, 0.25),
    paddingHorizontal: responsiveSpace(12),
    gap: responsiveSpace(4),
    hitSlop: {
      top: Math.max(0, Math.round((44 - mvs(32, 0.25)) / 2)),
      bottom: Math.max(0, Math.round((44 - mvs(32, 0.25)) / 2)),
      left: Math.max(0, Math.round((44 - responsiveSpace(12) * 2) / 2)),
      right: Math.max(0, Math.round((44 - responsiveSpace(12) * 2) / 2)),
    },
  },
  md: {
    minHeight: minTouchTarget(40),
    paddingHorizontal: responsiveSpace(16),
    gap: responsiveSpace(6),
  },
  lg: {
    minHeight: minTouchTarget(56),
    paddingHorizontal: responsiveSpace(24),
    gap: responsiveSpace(8),
  },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  onPress,
  disabled,
  loading,
  variant = 'primary',
  size = 'md',
  rounded = 'full',
  className,
  textClassName,
  children,
  fullWidth = false,
  leftIcon,
  rightIcon,
  accessibilityLabel,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const v = variantStyles[variant];
  const s = sizeMetrics[size];

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (!isDisabled && onPress) {
      Haptics.selectionAsync();
      onPress();
    }
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={handlePress}
      disabled={isDisabled}
      hitSlop={s.hitSlop}
      onPressIn={() => {
        scale.value = withTiming(0.97, { duration: 100 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 150 });
      }}
      android_ripple={
        Platform.OS === 'android'
          ? { color: COLORS.brandTint, borderless: false, radius: -1 }
          : undefined
      }
      style={[
        animStyle,
        {
          minHeight: s.minHeight,
          paddingHorizontal: s.paddingHorizontal,
          gap: s.gap,
        },
      ]}
      className={cn(
        'flex-row items-center justify-center',
        v.container,
        rounded === 'xl'
          ? 'rounded-xl'
          : rounded === '2xl'
            ? 'rounded-2xl'
            : rounded === 'lg'
              ? 'rounded-lg'
              : 'rounded-full',
        fullWidth && 'w-full',
        isDisabled && 'opacity-50',
        className,
      )}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'destructive' ? COLORS.textInverse : COLORS.brand}
        />
      ) : (
        <>
          {leftIcon && <View>{leftIcon}</View>}
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.4}
            className={cn(v.text, textClassName)}
            style={size === 'lg' ? TYPE.button : TYPE.buttonSmall}
          >
            {children}
          </Text>
          {rightIcon && <View>{rightIcon}</View>}
        </>
      )}
    </AnimatedPressable>
  );
}
