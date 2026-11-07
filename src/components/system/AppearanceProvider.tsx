import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { vars } from 'nativewind';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, DarkTheme, DefaultTheme } from 'expo-router';
import { useThemeColors, useResolvedAppearance } from '@/hooks/use-theme-colors';
import { useAppearanceStore } from '@/store/appearance.store';
import { DeepSkyBackdrop } from './DeepSkyBackdrop';
import { APPEARANCE_VARIABLES, DEEP_SKY } from '@/constants/appearance';

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const colors = useThemeColors();
  const deepSky = useAppearanceStore((s) => s.preference === 'deep-sky');
  const scheme = useResolvedAppearance();
  useEffect(() => { void useAppearanceStore.getState().hydrate(); }, []);
  const variables = useMemo(() => vars(Object.fromEntries(
    Object.entries(APPEARANCE_VARIABLES).map(([key, token]) => [key, colors[token]]),
  )), [colors]);
  const navigationTheme = useMemo(() => ({
    ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background, card: colors.card, text: colors.textStrong,
      primary: colors.brand, border: colors.strokeWeak, notification: colors.brand,
    },
  }), [colors, scheme]);
  return (
    <ThemeProvider value={navigationTheme}>
      <View style={[{ flex: 1, backgroundColor: deepSky ? DEEP_SKY.canvas : colors.background }, variables]}>
        {deepSky && <DeepSkyBackdrop />}
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        {children}
      </View>
    </ThemeProvider>
  );
}
