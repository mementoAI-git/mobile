import React from 'react';
import { Platform, View } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';
import { FloatingVoiceCall } from '@/components/chat/FloatingVoiceCall';
import { FloatingRecorder } from '@/components/overview/FloatingRecorder';
import { VoiceScreenBeam, useVoiceBeamHosted } from '@/components/effects/VoiceGlow';
import { useVoiceCall } from '@/hooks/use-voice-call';

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
      <AppVoiceBeam />
      <FloatingVoiceCall />
      {/* A minimized Overview recording floats the same way. */}
      <FloatingRecorder />
    </View>
  );
}

/**
 * The voice beam over every screen while a call is live. A screen that draws
 * it behind its own content (the chat) takes over while it is open.
 */
function AppVoiceBeam() {
  const { voice } = useVoiceCall();
  const hosted = useVoiceBeamHosted();
  const active = voice.isConnected && !voice.isEnding && !hosted;
  const [mounted, setMounted] = React.useState(active);
  // Stay mounted for the fade out.
  React.useEffect(() => {
    if (active) { setMounted(true); return; }
    const id = setTimeout(() => setMounted(false), 600);
    return () => clearTimeout(id);
  }, [active]);
  if (!mounted) return null;
  const beam = <VoiceScreenBeam active={active} level={voice.getPlaybackLevel} />;
  return Platform.OS === 'ios' ? <FullWindowOverlay>{beam}</FullWindowOverlay> : beam;
}

