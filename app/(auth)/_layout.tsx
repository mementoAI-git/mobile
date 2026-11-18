import { useThemeColors } from '@/hooks/use-theme-colors';
import React from 'react';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  const COLORS = useThemeColors();
  return (
    <>
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
