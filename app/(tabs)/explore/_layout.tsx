import React from 'react';
import { Stack } from 'expo-router';

// Explore uses a Stack because it has a nested [id] category detail screen.
export default function ExploreStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
        animation: 'slide_from_right',
      }}
    />
  );
}
