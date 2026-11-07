import React from 'react';
import { ImageBackground, type ImageBackgroundProps } from 'react-native';
import { useResolvedAppearance, useThemeColors } from '@/hooks/use-theme-colors';

/** Keep decorative card artwork subtle against the current surface, never dim content. */
export function ThemedCardBackground({ style, imageStyle, ...props }: ImageBackgroundProps) {
  const colors = useThemeColors();
  const dark = useResolvedAppearance() === 'dark';
  return (
    <ImageBackground {...props} style={[{ backgroundColor: colors.cardRaised }, style]}
      imageStyle={[imageStyle, { opacity: dark ? 0.08 : 1 }]} />
  );
}
