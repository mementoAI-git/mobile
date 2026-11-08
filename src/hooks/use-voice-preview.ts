import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useBackgroundMusic } from './use-background-music';
import { useFeedAudioPlaybackStore } from '@/store/audio-playback.store';
import { VoicePreviewPlayback, type VoicePreviewStatus } from '@/features/chat/voice-preview-playback';
import { pickVoicePreviewClip } from '@/features/chat/voice-preview-assets';
import type { VoiceId } from '@/features/chat/voice-catalog';

export function useVoicePreview(voiceId: VoiceId, enabled: boolean) {
  const [status, setStatus] = useState<VoicePreviewStatus>('idle');
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const mountedRef = useRef(false);
  const music = useBackgroundMusic();
  const musicRef = useRef(music);
  musicRef.current = music;
  // Each play reads a different sentence than the one just heard, like web.
  const lastLineRef = useRef<number | null>(null);
  const playback = useMemo(() => new VoicePreviewPlayback({
    prepare: () => setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false, shouldPlayInBackground: false }),
    createPlayer: (id) => {
      const clip = pickVoicePreviewClip(id, lastLineRef.current);
      if (!clip) throw new Error(`No preview recorded for ${id}`);
      lastLineRef.current = clip.line;
      return createAudioPlayer(clip.asset, { updateInterval: 100 });
    },
    onStatus: (next) => { if (mountedRef.current) setStatus(next); },
  }), []);

  useEffect(() => {
    mountedRef.current = true;
    musicRef.current.pauseForVoice();
    useFeedAudioPlaybackStore.getState().stop();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') playback.stop();
      if (mountedRef.current) setForeground(state === 'active');
    });
    return () => {
      mountedRef.current = false;
      subscription.remove();
      playback.stop();
      musicRef.current.resumeAfterVoice();
    };
  }, [playback]);

  useFocusEffect(useCallback(() => {
    if (enabled && foreground) void playback.play(voiceId);
    else playback.stop();
    return () => playback.stop();
  }, [enabled, foreground, playback, voiceId]));

  const replay = useCallback(() => {
    if (enabled && foreground) void playback.play(voiceId);
  }, [enabled, foreground, playback, voiceId]);
  const stop = useCallback(() => playback.stop(), [playback]);
  return { status, replay, stop };
}
