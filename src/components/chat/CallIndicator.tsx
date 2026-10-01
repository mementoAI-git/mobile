import React from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AudioLines, MicOff } from 'lucide-react-native';

import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import {
  callIndicatorStatus,
  callIndicatorVariant,
  isCallLive,
  islandCapsuleFrame,
  shouldShowCallIndicator,
} from '@/features/chat/call-indicator';
import { formatVoiceCallDuration } from '@/features/chat/voice-call-flow';
import { useVoiceCall, VOICE_CALL_PATH } from '@/hooks/use-voice-call';

const returnToCall = () => router.push(VOICE_CALL_PATH as never);

/**
 * Wraps the root navigator and floats a call indicator over it while a call
 * runs away from the call screen. Nothing on screen moves. On Dynamic Island
 * iPhones the indicator is a capsule that makes the island look like it grew
 * to show the call. Elsewhere the status bar area turns green, like the
 * classic iPhone in-call bar.
 */
export function CallIndicatorLayout({ children }: { children: React.ReactNode }) {
  const { voice } = useVoiceCall();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const visible = shouldShowCallIndicator({
    isConnected: isCallLive(voice),
    pathname,
    platform: Platform.OS,
    callPath: VOICE_CALL_PATH,
  });
  const variant = callIndicatorVariant(Platform.OS, insets.top);

  // Keep this tree shape fixed: the navigator must never remount.
  return (
    <View style={{ flex: 1 }}>
      {children}
      {visible && variant === 'island' ? <IslandCapsule topInset={insets.top} /> : null}
      {visible && variant === 'statusBar' ? <StatusBarTint height={insets.top} /> : null}
    </View>
  );
}

function IslandCapsule({ topInset }: { topInset: number }) {
  const { voice } = useVoiceCall();
  const frame = islandCapsuleFrame(topInset);
  const time = formatVoiceCallDuration(voice.recordingTime);

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(160)}
      pointerEvents="box-none"
      style={{ position: 'absolute', top: frame.top, left: 0, right: 0, alignItems: 'center' }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Return to voice call, ${time}, ${callIndicatorStatus(voice)}`}
        onPress={returnToCall}
        style={{
          width: frame.width,
          height: frame.height,
          borderRadius: frame.radius,
          backgroundColor: COLORS.dynamicIsland,
          justifyContent: 'flex-end',
          paddingBottom: 5,
        }}
      >
        <View
          className="flex-row items-center justify-center gap-2"
          style={{ height: frame.rowHeight }}
        >
          {voice.isMuted ? (
            <MicOff size={16} color={COLORS.error} />
          ) : (
            <AudioLines size={16} color={voice.isAiSpeaking ? COLORS.brand : COLORS.success} />
          )}
          <Text style={{ ...TYPE.label, color: COLORS.textInverse, fontVariant: ['tabular-nums'] }}>
            {time}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function StatusBarTint({ height }: { height: number }) {
  const { voice } = useVoiceCall();

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(160)}
      style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
    >
      <StatusBar style="light" />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Return to voice call, ${formatVoiceCallDuration(voice.recordingTime)}, ${callIndicatorStatus(voice)}`}
        onPress={returnToCall}
        style={{ height: Math.max(height, 4), backgroundColor: COLORS.success }}
      />
    </Animated.View>
  );
}
