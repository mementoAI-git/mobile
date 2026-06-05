import React, { useEffect } from 'react';
import { View, type ViewProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { cn } from '@/lib/utils';
import { COLORS } from '@/constants/tokens';

interface ProgressProps extends ViewProps {
  /** 0–100 */
  value?: number;
  /** Track height in px. Default: 8 */
  height?: number;
  /** Fill color. Default: brand orange */
  color?: string;
  className?: string;
}

/**
 * Progress — animated progress bar, mirrors web shadcn `<Progress />`.
 * - Track: `stroke-weaker` (rgba(23,11,0,0.04))
 * - Fill: brand orange by default; spring-animated
 * - Radius: `rounded-full` (pill) — matches web `rounded-4xl` on progress
 */
export function Progress({
  value = 0,
  height = 8,
  color = COLORS.brand,
  className,
  style,
  ...props
}: ProgressProps) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const widthAnim = useSharedValue(clampedValue);

  useEffect(() => {
    widthAnim.value = withSpring(clampedValue, { damping: 20, stiffness: 120 });
  }, [clampedValue]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${widthAnim.value}%`,
  }));

  return (
    <View
      {...props}
      style={[{ height }, style]}
      className={cn('w-full overflow-hidden rounded-full bg-stroke-weaker', className)}
    >
      <Animated.View
        style={[{ height, backgroundColor: color }, fillStyle]}
        className="rounded-full"
      />
    </View>
  );
}
