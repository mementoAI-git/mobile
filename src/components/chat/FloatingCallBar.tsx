import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MicOff, PhoneOff } from 'lucide-react-native';

import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { formatVoiceCallDuration } from '@/features/chat/voice-call-flow';
import { useVoiceCall, VOICE_CALL_PATH } from '@/hooks/use-voice-call';

/** Shown on every screen except the call screen while a call is live. */
export function FloatingCallBar() {
  const { voice } = useVoiceCall();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  if (!voice.isConnected || pathname === VOICE_CALL_PATH) return null;

  const status = voice.isMuted
    ? 'Muted, tap to talk'
    : voice.isAiSpeaking
      ? 'Memento is speaking'
      : 'Listening';

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16 }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Return to voice call"
        onPress={() => router.push(VOICE_CALL_PATH as never)}
        className="min-h-11 flex-row items-center rounded-full pl-4"
        style={{ backgroundColor: COLORS.backgroundInverse }}
      >
        <View
          className="size-2 rounded-full"
          style={{
            backgroundColor: voice.isMuted
              ? COLORS.error
              : voice.isAiSpeaking
                ? COLORS.brand
                : COLORS.success,
          }}
        />
        <Text
          numberOfLines={1}
          className="ml-3 flex-1"
          style={{ ...TYPE.label, color: COLORS.textInverse }}
        >
          {`${formatVoiceCallDuration(voice.recordingTime)} · ${status}`}
        </Text>
        {voice.isMuted ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Unmute"
            onPress={voice.toggleMute}
            className="min-h-11 min-w-11 items-center justify-center"
          >
            <MicOff size={20} color={COLORS.textInverse} />
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="End call"
          onPress={() => void voice.disconnect()}
          className="min-h-11 min-w-11 items-center justify-center"
        >
          <PhoneOff size={20} color={COLORS.error} />
        </Pressable>
      </Pressable>
    </View>
  );
}