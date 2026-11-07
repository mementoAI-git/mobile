import React from 'react';
import { Stack } from 'expo-router';

// Keep the list behind direct story links so native swipe-back has a destination.
export const unstable_settings = { initialRouteName: 'index' };

// Stories uses a Stack because it has a nested [id] detail screen that needs
// stack push/pop navigation within the tab.
export default function StoriesStack() {
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
