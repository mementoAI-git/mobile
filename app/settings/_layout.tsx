import { useThemeColors } from '@/hooks/use-theme-colors';
import React from 'react';
import { Stack, usePathname } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsLayout() {
  const COLORS = useThemeColors();
  const insets = useSafeAreaInsets();
  // Only the hub shows the tab bar; child pages are full-screen and handle their own safe area.
  const onHub = usePathname() === '/settings';
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background, paddingBottom: onHub ? Math.max(insets.bottom, 16) + 58 : 0 }}>
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    />
    </View>
  );
}
