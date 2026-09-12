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

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type Size = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps {
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  size?: Size;
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
};

// All sizes use rounded-full (web rounded-4xl = 32px pill)
const sizeStyles: Record<Size, { container: string; text: string }> = {
  xs: { container: 'h-6 px-2.5 gap-1 rounded-full',  text: '' },
  sm: { container: 'h-8 px-3 gap-1 rounded-full',    text: '' },
  md: { container: 'h-10 px-4 gap-1.5 rounded-full', text: '' }, // compact button (40px)
  lg: { container: 'h-14 px-6 gap-2 rounded-full',   text: '' }, // standard button (56px)
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  onPress,
  disabled,
  loading,
  variant = 'primary',
  size = 'md',
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
  const s = sizeStyles[size];

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
      style={animStyle}
      className={cn(
        'flex-row items-center justify-center',
        v.container,
        s.container,
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
            className={cn(v.text, s.text, textClassName)}
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
