import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import type { VoiceId } from '@/features/chat/voice-catalog';
import { VOICE_PREVIEW_CLIPS, pickVoicePreviewClip } from '@/features/chat/voice-preview-assets';

/**
 * Tap-to-hear voice samples, set up like web `useVoicePreviewClip` so a sample
 * starts the moment a voice is tapped: every bundled clip gets a player when the
 * screen opens (web preloads them too), the audio session is configured once
 * ahead of time, and a tap only rewinds and plays. Each tap reads a different
 * sentence than the one just heard.
 */
export function useVoiceSampleClips() {
  const playersRef = useRef(new Map<number, AudioPlayer>());
  const currentRef = useRef<AudioPlayer | null>(null);
  const lastLineRef = useRef<number | null>(null);
  const readyRef = useRef<Promise<void> | null>(null);

  const stop = useCallback(() => {
    const current = currentRef.current;
    currentRef.current = null;
    try { current?.pause(); } catch { /* Already released by the OS. */ }
  }, []);

  useEffect(() => {
    readyRef.current = setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false, shouldPlayInBackground: false })
      .catch(() => undefined);
    const players = playersRef.current;
    for (const clips of Object.values(VOICE_PREVIEW_CLIPS)) {
      for (const clip of clips) {
        if (!players.has(clip.asset)) players.set(clip.asset, createAudioPlayer(clip.asset));
      }
    }
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') stop();
    });
    return () => {
      subscription.remove();
      stop();
      for (const player of players.values()) {
        try { player.remove(); } catch { /* Already released. */ }
      }
      players.clear();
    };
  }, [stop]);

  /** Plays a sample for this voice; false when there is none to play. */
  const play = useCallback((voiceId: VoiceId) => {
    stop();
    const clip = pickVoicePreviewClip(voiceId, lastLineRef.current);
    if (!clip) return false;
    lastLineRef.current = clip.line;
    let player = playersRef.current.get(clip.asset);
    if (!player) {
      player = createAudioPlayer(clip.asset);
      playersRef.current.set(clip.asset, player);
    }
    const chosen = player;
    currentRef.current = chosen;
    const start = () => {
      if (currentRef.current !== chosen) return;
      void chosen.seekTo(0).catch(() => undefined);
      chosen.play();
    };
    // The audio mode is set when the screen opens, so this is normally already done.
    if (readyRef.current) void readyRef.current.then(start);
    else start();
    return true;
  }, [stop]);

  return { play, stop };
}
