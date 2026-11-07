import { VoiceGlow } from '@/components/effects/VoiceGlow';
import React, { useCallback } from 'react';
import { Text, View } from 'react-native';
import Mic from 'lucide-react-native/icons/mic';
import MicOff from 'lucide-react-native/icons/mic-off';
import SlidersHorizontal from 'lucide-react-native/icons/sliders-horizontal';
import PhoneOff from 'lucide-react-native/icons/phone-off';
import { Button } from '@/components/ui/Button';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useVoiceCall } from '@/hooks/use-voice-call';
import { useUiStore, useVoicePreferenceStore } from '@/store';
import { TYPE } from '@/constants/typography';
import { VoiceArtwork } from './VoiceArtwork';
import { getVoiceById, VOICE_CATALOG, type VoiceDefinition } from '@/features/chat/voice-catalog';
import { formatVoiceCallDuration } from '@/features/chat/voice-call-flow';

export function VoiceChatComposer() {
  const { voice } = useVoiceCall();
  const selectedVoiceId = useVoicePreferenceStore(state => state.selectedVoiceId);
  const toggleMute = useCallback(() => voice.setMuted(!voice.isMuted), [voice]);
  const requestEnd = useCallback(() => {
    useUiStore.getState().openSheet('end-voice-session', {
      duration: voice.recordingTime,
      onEnd: voice.disconnect,
    });
  }, [voice.recordingTime, voice.disconnect]);
  const openSettings = useCallback(() => {
    useUiStore.getState().openSheet('voice-call-settings', {
      selectedVoiceId: selectedVoiceId ?? 'denver',
      onSaved: voice.disconnect,
    });
  }, [selectedVoiceId, voice.disconnect]);
  const status = voice.isEnding ? 'Ending…' : voice.isReconnecting ? 'Reconnecting…'
    : voice.isConnecting ? 'Connecting…' : voice.isMuted ? 'You’re muted'
      : 'Live session';
  return <VoiceChatComposerContent
    artworkVoice={getVoiceById(selectedVoiceId) ?? VOICE_CATALOG[0]}
    status={status} duration={voice.recordingTime} muted={voice.isMuted}
    connected={voice.isConnected} ending={voice.isEnding} playbackLevel={voice.getPlaybackLevel}
    onToggleMute={toggleMute} onSettings={openSettings} onEnd={requestEnd}
  />;
}

interface VoiceChatComposerContentProps {
  artworkVoice: VoiceDefinition;
  status: string;
  duration: number;
  muted: boolean;
  connected: boolean;
  ending: boolean;
  playbackLevel?: () => number;
  onToggleMute: () => void;
  onSettings: () => void;
  onEnd: () => void;
}

export const VoiceChatComposerContent = React.memo(function VoiceChatComposerContent({
  artworkVoice, status, duration, muted, connected, ending, playbackLevel, onToggleMute, onSettings, onEnd,
}: VoiceChatComposerContentProps) {
  const colors = useThemeColors();
  return (
    <View className="px-4 pt-2 pb-3">
      <View style={{ backgroundColor: colors.cardRaised, borderRadius: 20, padding: 20, gap: 48, overflow: 'hidden' }}>
        {playbackLevel && <VoiceGlow active={connected && !ending} level={playbackLevel} />}
        <View className="flex-row items-center gap-4">
          <VoiceArtwork voice={artworkVoice} size={42} />
          <View className="flex-1 gap-1">
            <Text className="text-text-strong" style={TYPE.voicePickerTitle}>
              {formatVoiceCallDuration(duration)}
            </Text>
            <View className="flex-row items-center gap-2">
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: muted ? colors.error : connected ? colors.success : colors.textWeak }} />
              <Text accessibilityLiveRegion="polite" className="text-text-base" style={TYPE.body}>
                {status}
              </Text>
            </View>
          </View>
          <Button iconOnly variant="ghost" rounded="full" disabled={ending} onPress={onSettings} accessibilityLabel="Voice settings"
            style={{ width: 44, height: 44, minHeight: 44, paddingHorizontal: 0, backgroundColor: colors.fillWeak }}>
            <SlidersHorizontal size={22} color={colors.textBase} />
          </Button>
        </View>
        <View className="flex-row items-center gap-4">
          <Button iconOnly variant="ghost" rounded="full" disabled={!connected || ending} onPress={onToggleMute} accessibilityLabel={muted ? 'Unmute microphone' : 'Mute microphone'}
            style={{ width: 52, height: 52, minHeight: 52, paddingHorizontal: 0, backgroundColor: muted ? colors.activeFill : colors.fillWeak }}>
            {muted ? <MicOff size={24} color={colors.activeText} /> : <Mic size={24} color={colors.textStrong} />}
          </Button>
          <Button iconOnly variant="ghost" rounded="full" disabled={ending} onPress={onEnd} accessibilityLabel="End voice conversation"
            style={{ width: 52, height: 52, minHeight: 52, paddingHorizontal: 0, backgroundColor: colors.errorFill }}>
            <PhoneOff size={24} color={colors.error} />
          </Button>
        </View>
      </View>
    </View>
  );
});
