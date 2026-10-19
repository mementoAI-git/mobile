import { useThemeColors } from '@/hooks/use-theme-colors';
import React from 'react';
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsLayout() {
  const COLORS = useThemeColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background, paddingBottom: Math.max(insets.bottom, 16) + 58 }}>
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    />
    </View>
  );
}
