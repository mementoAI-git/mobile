import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioModule, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranscribeRecording } from '@/hooks/mutations/use-transcribe-recording';
import { STORY_RECORDING_OPTIONS } from '@/features/editor/story-recording-options';
import { RecordingTranscription } from '@/features/editor/recording-transcription';
import { isPermissionGranted, type PermissionLike } from '@/lib/permission-recovery';
import { logger } from '@/lib/logger';

type Phase = 'idle' | 'starting' | 'recording' | 'transcribing';

export const START_FAILED_MESSAGE = 'The microphone didn’t start. Close other apps using audio, then try again.';

/**
 * Switches the audio session to recording and prepares the file. iOS can refuse to activate
 * the session for a moment (right after a sheet opens, a call ends or other audio stops), so a
 * failed attempt is retried once after a short pause.
 */
async function prepareMicrophone(recorder: { prepareToRecordAsync: () => Promise<void> }, background: boolean) {
  const mode = { allowsRecording: true, playsInSilentMode: true, allowsBackgroundRecording: background };
  try {
    await setAudioModeAsync(mode);
    await recorder.prepareToRecordAsync();
  } catch {
    await new Promise<void>((resolve) => setTimeout(resolve, 400));
    await setAudioModeAsync(mode);
    await recorder.prepareToRecordAsync();
  }
}
async function preserveRecording(uri: string, key: string) {
  if (uri.startsWith(Paths.document.uri)) {
    await AsyncStorage.setItem(key, uri);
    return uri;
  }
  let retained = uri;
  const saved = new File(Paths.document, `story-recording-${Date.now()}.m4a`);
  try { new File(uri).copy(saved); retained = saved.uri; } catch { /* Original stays available. */ }
  await AsyncStorage.setItem(key, retained);
  if (retained !== uri) { try { new File(uri).delete(); } catch { /* Cache already cleared. */ } }
  return retained;
}

/**
 * Records a story from the microphone. With `onRecording`, the finished audio file is handed
 * over as is (the editor attaches it to the story); otherwise it is transcribed and the text
 * goes to `onTranscript`. Either way a failed hand-off keeps the file for retry.
 */
export function useStoryRecording({ owner, onTranscript, onRecording, onPermissionDenied, background = false }: {
  owner: string;
  /** Keep recording when the app goes to the background or the phone locks. */
  background?: boolean;
  onTranscript?: (text: string) => Promise<void>;
  /** Receives the recording file and its length in seconds. Throw to keep it for retry. */
  onRecording?: (uri: string, seconds: number) => Promise<void>;
  onPermissionDenied: (permission: PermissionLike) => void;
}) {
  const interrupted = useRef<() => Promise<void>>(async () => {});
  const recorder = useAudioRecorder(STORY_RECORDING_OPTIONS, status => {
    if (status.isFinished || status.hasError) void interrupted.current();
  });
  const state = useAudioRecorderState(recorder, 100);
  const { mutateAsync: transcribe } = useTranscribeRecording();

  const session = useRef(new RecordingTranscription()).current;
  const mounted = useRef(true);
  const phaseRef = useRef<Phase>('idle');
  const callbacks = useRef({ onTranscript, onRecording, onPermissionDenied, transcribe });
  callbacks.current = { onTranscript, onRecording, onPermissionDenied, transcribe };
  /** Length of the last finished recording; unknown (0) for one restored from a previous session. */
  const recordedSeconds = useRef(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  /** False until the check for a recording kept from a previous session has finished. */
  const [ready, setReady] = useState(false);
  const [levels, setLevels] = useState<number[]>(Array(32).fill(0));
  // A paused recorder reports isRecording false but still holds the take, so stop and cleanup check this too.
  const pausedRef = useRef(false);
  const [paused, setPausedState] = useState(false);
  const setPaused = useCallback((next: boolean) => { pausedRef.current = next; if (mounted.current) setPausedState(next); }, []);
  const storageKey = `story-recording:${owner}`;
  const transition = useCallback((next: Phase) => { phaseRef.current = next; if (mounted.current) setPhase(next); }, []);

  useEffect(() => {
    mounted.current = true;
    let active = true;
    AsyncStorage.getItem(storageKey).then(uri => {
      if (!active) return;
      setReady(true);
      if (!uri || phaseRef.current !== 'idle') return;
      if (new File(uri).exists) {
        session.retain(uri); setCanRetry(true);
        setError(callbacks.current.onRecording
          ? 'Your previous recording is saved and ready to add.'
          : 'Your previous recording is saved and ready to transcribe.');
      } else void AsyncStorage.removeItem(storageKey);
    }).catch(() => { if (active) setReady(true); });
    return () => {
      active = false; mounted.current = false; session.cancelRequest();
      try {
        if (recorder.isRecording || pausedRef.current) {
          const uri = recorder.uri;
          void recorder.stop().catch(() => {}).then(async () => { if (uri) await preserveRecording(uri, storageKey); }).catch(() => {});
        }
      } catch { /* Native recorder already released. */ }
      void setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    };
  }, [storageKey, recorder, session]);

  useEffect(() => {
    if (!state.isRecording) return;
    const amplitude = state.metering === undefined ? 0 : Math.max(0, Math.min(1, (state.metering + 60) / 60));
    setLevels(previous => [...previous.slice(1), amplitude]);
  }, [state.durationMillis, state.isRecording, state.metering]);

  const retry = useCallback(async () => {
    if (phaseRef.current !== 'idle' || !session.uri) return;
    transition('transcribing'); setError(null); setCanRetry(false);
    const uri = session.uri;
    try {
      const { onRecording: deliverAudio } = callbacks.current;
      const success = deliverAudio
        ? await deliverAudio(uri, recordedSeconds.current).then(() => true)
        : await session.run((file, signal) => callbacks.current.transcribe({ uri: file, signal }), async text => {
          if (!mounted.current) throw new Error('The editor closed. Your recording is saved.');
          await callbacks.current.onTranscript?.(text);
        });
      if (success && deliverAudio) session.uri = null;
      if (success) {
        // The text is already inserted. Cleanup must not hold the editor in its busy state.
        if (mounted.current) { setCanRetry(false); transition('idle'); }
        void AsyncStorage.removeItem(storageKey).catch(() => {}).then(() => {
          try { new File(uri).delete(); } catch { /* The transcript is already retained. */ }
        });
      }
    } catch (cause) {
      const fallback = callbacks.current.onRecording
        ? 'Could not add the recording. It is saved for retry.'
        : 'Could not transcribe. Your recording is saved for retry.';
      if (mounted.current) setError(cause instanceof Error ? cause.message : fallback);
    } finally {
      if (mounted.current) { setCanRetry(Boolean(session.uri)); transition('idle'); }
    }
  }, [session, storageKey, transition]);

  const start = useCallback(async () => {
    if (phaseRef.current !== 'idle' || session.uri) return false;
    transition('starting'); setError(null);
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!mounted.current || (phaseRef.current as Phase) !== 'starting') return false;
      if (!isPermissionGranted(permission)) { callbacks.current.onPermissionDenied(permission); transition('idle'); return false; }
      await prepareMicrophone(recorder, background);
      if (!mounted.current || (phaseRef.current as Phase) !== 'starting') return false;
      recorder.record();
      if (!recorder.isRecording) throw new Error('The microphone did not start. Please try again.');
      setLevels(Array(32).fill(0)); setPaused(false); transition('recording');
      return true;
    } catch (cause) {
      logger.handledError('Failed to start story recording', cause);
      if (mounted.current) setError(START_FAILED_MESSAGE);
      transition('idle'); return false;
    }
  }, [background, recorder, session, setPaused, transition]);

  /** Holds the take without finishing it; `resume` carries on recording into the same file. */
  const pause = useCallback(() => {
    if (phaseRef.current !== 'recording' || pausedRef.current) return;
    try { recorder.pause(); setPaused(true); } catch { /* Native recorder already released. */ }
  }, [recorder, setPaused]);

  const resume = useCallback(() => {
    if (phaseRef.current !== 'recording' || !pausedRef.current) return;
    try { recorder.record(); setPaused(false); } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'Could not resume recording.');
    }
  }, [recorder, setPaused]);

  const stop = useCallback(async () => {
    if (phaseRef.current !== 'recording') return;
    transition('transcribing');
    try {
      recordedSeconds.current = Math.round(state.durationMillis / 1000);
      if (recorder.isRecording || pausedRef.current) await recorder.stop();
      setPaused(false);
      const uri = recorder.uri || state.url;
      if (!uri) throw new Error('Could not find the recording. Please try again.');
      // Keep the original before copying, so a storage failure does not lose the audio.
      session.retain(uri);
      session.retain(await preserveRecording(uri, storageKey));
    } catch (cause) {
      if (mounted.current) { setError(cause instanceof Error ? cause.message : 'Could not finish recording.'); setCanRetry(Boolean(session.uri)); }
      transition('idle'); return;
    } finally { void setAudioModeAsync({ allowsRecording: false }).catch(() => {}); }
    transition('idle');
    if (mounted.current) await retry();
  }, [recorder, retry, session, setPaused, state.durationMillis, state.url, storageKey, transition]);

  interrupted.current = async () => { if (phaseRef.current === 'recording') await stop(); };

  const cancel = useCallback(async () => {
    if (phaseRef.current === 'transcribing') { session.cancelRequest(); setCanRetry(Boolean(session.uri)); transition('idle'); return; }
    transition('idle');
    try {
      if (recorder.isRecording || pausedRef.current) await recorder.stop();
      setPaused(false);
      if (recorder.uri) { const file = new File(recorder.uri); if (file.exists) file.delete(); }
    } catch { /* Already stopped. */ }
    await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    if (mounted.current) setError(null);
  }, [recorder, session, setPaused, transition]);

  const discard = useCallback(async () => {
    if (phaseRef.current !== 'idle') return;
    const uri = session.uri;
    session.cancelRequest(); session.uri = null;
    await AsyncStorage.removeItem(storageKey).catch(() => {});
    if (uri) { try { new File(uri).delete(); } catch { /* Already removed. */ } }
    if (mounted.current) { setCanRetry(false); setError(null); }
  }, [session, storageKey]);

  return { phase, isRecording: phase === 'recording', isStarting: phase === 'starting', isTranscribing: phase === 'transcribing',
    ready, isPaused: paused, duration: Math.floor(state.durationMillis / 1000), levels, error, canRetry,
    start, stop, pause, resume, cancel, retry, discard };
}
