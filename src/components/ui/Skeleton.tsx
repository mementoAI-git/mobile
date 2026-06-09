import React, { useEffect, useRef } from 'react';
import { Animated, ViewProps } from 'react-native';
import { cn } from '@/lib/utils';
import { COLORS } from '@/constants/tokens';

interface SkeletonProps extends ViewProps {
  className?: string;
}

export function Skeleton({ className, style, ...props }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();

    return () => {
      loop.stop();
    };
  }, [opacity]);

  return (
    <Animated.View
      style={[{ opacity, backgroundColor: COLORS.fillWeak }, style]}
      className={cn('rounded-md', className)}
      {...props}
    />
  );
}
