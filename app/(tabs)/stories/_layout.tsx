import React from 'react';
import { Stack } from 'expo-router';

export default function StoriesStack() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />;
}
