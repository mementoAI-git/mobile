import React from 'react';
import { Slot } from 'expo-router';

// Using Slot instead of a Stack navigator so the index screen mounts directly
// without an extra navigation event — prevents the double-haptic on first cold launch.
export default function ChatLayout() {
  return <Slot />;
}
