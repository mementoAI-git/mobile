import React, { useCallback, useState } from 'react';
import { Platform, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { BlurView } from 'expo-blur';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResolvedAppearance, useThemeColors } from '@/hooks/use-theme-colors';

/**
 * Frosted fade behind a floating screen header: the chat composer backdrop, flipped.
 * Solid under the status bar, then fading progressively across the header to nothing
 * `fade` points below it. Place it as the first child of the header.
 */
export function FrostedHeaderBackdrop({ fade = 56, opacity = 0.98 }: { fade?: number; opacity?: number }) {
  const colors = useThemeColors();
  const dark = useResolvedAppearance() === 'dark';
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(0);
  const onLayout = useCallback((event: LayoutChangeEvent) => setHeight(event.nativeEvent.layout.height), []);
  const solidUntil = height > 0 ? Math.min(1, insets.top / height) : 0;
  return (
    <MaskedView
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={onLayout}
      style={[StyleSheet.absoluteFill, { top: -insets.top, bottom: -fade, opacity }]}
      maskElement={(
        <LinearGradient
          colors={[colors.textInverse, colors.textInverse, 'transparent']}
          locations={[0, solidUntil, 1]}
          style={{ flex: 1 }}
        />
      )}
    >
      {Platform.OS === 'ios' && <BlurView tint={dark ? 'dark' : 'light'} intensity={90} style={StyleSheet.absoluteFill} />}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: Platform.OS === 'ios' ? colors.glass : colors.popover }]} />
    </MaskedView>
  );
}

/** Frosts whatever scrolls under a round header button, so its icon stays legible. Clip it with the button's radius. */
export function HeaderButtonBlur({ dark }: { dark: boolean }) {
  if (Platform.OS !== 'ios') return null;
  return <BlurView pointerEvents="none" tint={dark ? 'dark' : 'light'} intensity={40} style={StyleSheet.absoluteFill} />;
}
