import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { COLORS } from '@/constants/tokens';

interface SpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  fullScreen?: boolean;
}

// Default colour = brand token
export function Spinner({ size = 'large', color = COLORS.brand, fullScreen }: SpinnerProps) {
  if (fullScreen) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size={size} color={color} />
      </View>
    );
  }
  return <ActivityIndicator size={size} color={color} />;
}
