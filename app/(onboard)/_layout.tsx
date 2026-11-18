import React from 'react';
import { Stack } from 'expo-router';
import { COLORS } from '@/constants/tokens';

export default function OnboardLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="nickname" />
        <Stack.Screen name="preferences" />
        <Stack.Screen name="summary" />
      </Stack>
    </>
  );
}
