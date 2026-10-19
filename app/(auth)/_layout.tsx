import { useThemeColors } from '@/hooks/use-theme-colors';
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '@/constants/tokens';

export default function AuthLayout() {
  const COLORS = useThemeColors();
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: COLORS.background },
        }}
      />
    </>
  );
}
