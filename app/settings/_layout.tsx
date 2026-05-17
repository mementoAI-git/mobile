import React from 'react';
import { Stack } from 'expo-router';
import { COLORS } from '@/constants/tokens';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    />
  );
}

