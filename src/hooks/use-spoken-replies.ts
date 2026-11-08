import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { useBackgroundMusic } from '@/hooks/use-background-music';
import { useFeedAudioPlaybackStore } from '@/store/audio-playback.store';
import { useSpokenRepliesStore } from '@/store/spoken-replies.store';
import { requestSpokenAudio, spokenReplyChunks, spokenReplyErrorMessage, type SpokenAudio } from '@/features/speech/spoken-audio';
import { toast } from '@/components/ui/Toast';

type Session = { cancelled: boolean; player?: AudioPlayer; file?: File };

/**
 * Voice narration: reads a finished reply aloud, clip by clip, fetching one
 * clip ahead (web `use-spoken-replies.ts`). Off while a voice call is live.
 */
export function useSpokenReplies(voiceActive = false) {
  const enabled = useSpokenRepliesStore((s) => s.enabled);
  const music = useBackgroundMusic();
  const musicRef = useRef(music);
  musicRef.current = music;
  const sessionRef = useRef<Session | null>(null);

  const stop = useCallback(() => {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (!session) return;
    session.cancelled = true;
    try { session.player?.pause(); session.player?.remove(); } catch { /* already released */ }
    try { session.file?.delete(); } catch { /* temp file */ }
    musicRef.current.resumeAfterVoice();
  }, []);

  useEffect(() => { if (!enabled || voiceActive) stop(); }, [enabled, voiceActive, stop]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => { if (state !== 'active') stop(); });
    return () => { sub.remove(); stop(); };
  }, [stop]);

  const playClip = useCallback((session: Session, clip: SpokenAudio, index: number) => new Promise<void>((resolve) => {
    if (session.cancelled) return resolve();
    const file = new File(Paths.cache, `spoken-reply-${Date.now()}-${index}.wav`);
    file.write(clip.audioBase64, { encoding: 'base64' });
    session.file = file;
    const player = createAudioPlayer({ uri: file.uri });
    session.player = player;
    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (!status.didJustFinish && !session.cancelled) return;
      sub.remove();
      try { player.remove(); } catch { /* released */ }
      try { file.delete(); } catch { /* temp file */ }
      resolve();
    });
    player.play();
  }), []);

  const speak = useCallback(async (text: string) => {
    if (!useSpokenRepliesStore.getState().enabled || voiceActive) return;
    const chunks = spokenReplyChunks(text);
    if (!chunks.length) return;
    stop();
    const session: Session = { cancelled: false };
    sessionRef.current = session;
    musicRef.current.pauseForVoice();
    useFeedAudioPlaybackStore.getState().stop();
    try {
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false, shouldPlayInBackground: false });
      let next: Promise<SpokenAudio> = requestSpokenAudio(chunks[0]);
      for (let index = 0; index < chunks.length; index += 1) {
        const clip = await next;
        if (session.cancelled) return;
        if (index + 1 < chunks.length) next = requestSpokenAudio(chunks[index + 1]);
        await playClip(session, clip, index);
        if (session.cancelled) return;
      }
    } catch (error) {
      if (!session.cancelled) toast(spokenReplyErrorMessage(error), 'error');
    } finally {
      if (sessionRef.current === session) {
        sessionRef.current = null;
        musicRef.current.resumeAfterVoice();
      }
    }
  }, [playClip, stop, voiceActive]);

  return { enabled, speak, stop };
}
