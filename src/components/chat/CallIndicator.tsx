import React from 'react';
import { View } from 'react-native';
import { FloatingVoiceCall } from '@/components/chat/FloatingVoiceCall';

/**
 * Wraps the root navigator and floats the live voice call over it, as on web.
 * The call card stays above every screen, sheet and native full-screen page
 * and survives navigation. Nothing on screen moves.
 */
export function CallIndicatorLayout({ children }: { children: React.ReactNode }) {
  // Keep this tree shape fixed: the navigator must never remount.
  return (
    <View style={{ flex: 1 }}>
      {children}
      <FloatingVoiceCall />
    </View>
  );
}
