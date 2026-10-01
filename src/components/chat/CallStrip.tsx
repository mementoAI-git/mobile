import React, { useMemo } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MicOff, PhoneOff } from 'lucide-react-native';

import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { callStripStatus, shouldShowCallStrip } from '@/features/chat/call-strip';
import { formatVoiceCallDuration } from '@/features/chat/voice-call-flow';
import { useVoiceCall, VOICE_CALL_PATH } from '@/hooks/use-voice-call';

const STRIP_ROW_HEIGHT = 36;
const BUTTON_HIT_SLOP = { top: 4, bottom: 4, left: 0, right: 0 };

/**
 * Wraps the root navigator. While a call runs away from the call screen, a
 * strip sits above the screens and pushes them down, like the iOS in-call
 * bar, instead of covering their headers. The screens then get a top inset
 * of 0, because the strip already covers the status bar.
 */
export function CallStripLayout({ children }: { children: React.ReactNode }) {
  const { voice } = useVoiceCall();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const visible = shouldShowCallStrip({
    isConnected: voice.isConnected,
    pathname,
    platform: Platform.OS,
    callPath: VOICE_CALL_PATH,
  });
  const screenInsets = useMemo(() => (visible ? { ...insets, top: 0 } : insets), [visible, insets]);

  // Keep this tree shape fixed whether or not the strip shows. Changing it
  // would remount the navigator and reset navigation.
  return (
    <View style={{ flex: 1 }}>
      {visible ? <CallStrip topInset={insets.top} /> : null}
      <SafeAreaInsetsContext.Provider value={screenInsets}>
        <View style={{ flex: 1 }}>{children}</View>
      </SafeAreaInsetsContext.Provider>
    </View>
  );
}

function CallStrip({ topInset }: { topInset: number }) {
  const { voice } = useVoiceCall();
  const dotColor = voice.isMuted ? COLORS.error : voice.isAiSpeaking ? COLORS.brand : COLORS.success;

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      style={{ backgroundColor: COLORS.backgroundInverse, paddingTop: topInset }}
    >
      {Platform.OS === 'ios' ? <StatusBar style="light" /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Return to voice call"
        onPress={() => router.push(VOICE_CALL_PATH as never)}
        className="flex-row items-center pl-4"
        style={{ height: STRIP_ROW_HEIGHT }}
      >
        <View className="size-2 rounded-full" style={{ backgroundColor: dotColor }} />
        <Text
          numberOfLines={1}
          className="ml-3 flex-1"
          style={{ ...TYPE.label, color: COLORS.textInverse }}
        >
          {`${formatVoiceCallDuration(voice.recordingTime)} · ${callStripStatus(voice)}`}
        </Text>
        {voice.isMuted ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Unmute"
            onPress={voice.toggleMute}
            hitSlop={BUTTON_HIT_SLOP}
            className="min-w-11 items-center justify-center"
            style={{ height: STRIP_ROW_HEIGHT }}
          >
            <MicOff size={18} color={COLORS.textInverse} />
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="End call"
          onPress={() => void voice.disconnect()}
          hitSlop={BUTTON_HIT_SLOP}
          className="min-w-11 items-center justify-center"
          style={{ height: STRIP_ROW_HEIGHT }}
        >
          <PhoneOff size={18} color={COLORS.error} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}