import React from 'react';
import { Image } from 'react-native';
import { useResolvedAppearance } from '@/hooks/use-theme-colors';

// Original web Quick tools artwork, exported at 3x for native rendering.
export function QuickToolsIcon() {
  const dark = useResolvedAppearance() === 'dark';
  return (
    <Image
      source={dark
        ? require('../../../../assets/images/icons/quick-tools/tools-dark.png')
        : require('../../../../assets/images/icons/quick-tools/tools-light.png')}
      style={{ width: 20, height: 20 }}
      accessible={false}
    />
  );
}
