import React from 'react';
import { Stack } from 'expo-router';

export default function OnboardLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: COLORS.background },
      }}
    />
  );
}

import { COLORS } from '@/constants/tokens';
