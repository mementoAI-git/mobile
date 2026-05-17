import React, { useEffect } from 'react';
import { View, Animated, StyleSheet, ViewProps } from 'react-native';
import { cn } from '@/lib/utils';
import { COLORS } from '@/constants/tokens';

interface SkeletonProps extends ViewProps {
  className?: string;
}

export function Skeleton({ className, style, ...props }: SkeletonProps) {
  const opacity = new Animated.Value(0.3);

  useEffect(() => {
    Animated.loop(
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
    ).start();
  }, []);

  return (
    <Animated.View
      style={[{ opacity, backgroundColor: COLORS.fillWeak }, style]}
      className={cn('rounded-md', className)}
      {...props}
    />
  );
}
