import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { logger } from '@/lib/logger';
import { SpeechSession } from '@/features/editor/speech-session';
import { isPermissionGranted, type PermissionLike } from '@/lib/permission-recovery';

// ─── Graceful Expo Go fallback ────────────────────────────────────────────────
// expo-speech-recognition requires a native build (the pod must be compiled in).
// In Expo Go the native module is absent and the import throws immediately.
// We lazy-require it so the crash is caught and we return a safe no-op hook
// instead of bringing down the whole app.
let _module: typeof import('expo-speech-recognition') | null = null;
let _moduleAvailable = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  _module = require('expo-speech-recognition');
  // Verify the actual native module is present (not just the JS shim)
  _moduleAvailable = !!_module?.ExpoSpeechRecognitionModule;
} catch {
  _moduleAvailable = false;
}

const SpeechModule = _module?.ExpoSpeechRecognitionModule;

// useSpeechRecognitionEvent is a pure-JS hook — safe to import at module level
// only when the module loaded correctly.
const useSpeechRecognitionEvent = _module?.useSpeechRecognitionEvent;
// ─────────────────────────────────────────────────────────────────────────────

export type VoiceToTextStatus = 'idle' | 'starting' | 'recording' | 'error';

export interface UseVoiceToTextOptions {
  onPartial: (text: string) => void;
  onTranscript: (text: string) => void;
  onError?: (err: Error) => void;
  onPermissionDenied?: (permission: PermissionLike) => void;
  /** Story dictation stays open across pauses; short chat dictation retains its default. */
  continuous?: boolean;
}
export interface UseVoiceToTextResult {
  status: VoiceToTextStatus;
  isRecording: boolean;
  isStarting: boolean;
  isUnavailable: boolean;
  duration: number;
  levels: number[];
  start: () => Promise<void>;
  stop: () => void;
  cancel: () => void;
}

/** Live native speech recognition; recording is confirmed by the audio-start event. */
export function useVoiceToText(options: UseVoiceToTextOptions): UseVoiceToTextResult {
  const [status, setStatus] = useState<VoiceToTextStatus>('idle');
  const [duration, setDuration] = useState(0);
  const session = useRef(new SpeechSession()).current;
  const [levels, setLevels] = useState(session.levels);
  const callbacks = useRef(options);
  callbacks.current = options;
  const mounted = useRef(true);
  const pendingStart = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    if (startupTimer.current) clearTimeout(startupTimer.current);
    timer.current = null;
    startupTimer.current = null;
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (session.active) { session.cancel(); SpeechModule?.abort(); }
      pendingStart.current = false;
      clearTimers();
    };
  }, [session, clearTimers]);

  const fail = useCallback((message: string) => {
    if (!mounted.current) return;
    session.cancel();
    pendingStart.current = false;
    clearTimers();
    setStatus('error');
    setDuration(0);
    callbacks.current.onError?.(new Error(message));
  }, [clearTimers, session]);

  const handleAudioStart = useCallback(() => {
    if (!mounted.current || !session.audioStarted()) return;
    if (startupTimer.current) clearTimeout(startupTimer.current);
    startupTimer.current = null;
    setStatus('recording');
    timer.current = setInterval(() => {
      if (mounted.current && session.capturing) setDuration(value => value + 1);
    }, 1000);
  }, [session]);

  const handleResult = useCallback((event: { results: { transcript: string }[]; isFinal: boolean }) => {
    if (!mounted.current) return;
    const text = session.result(event.results?.[0]?.transcript ?? '', event.isFinal);
    if (text !== null) callbacks.current.onPartial(text);
  }, [session]);

  const handleVolume = useCallback((event: { value: number }) => {
    if (!mounted.current) return;
    const next = session.volume(event.value);
    if (next) setLevels(next);
  }, [session]);

  const handleEnd = useCallback(() => {
    if (!mounted.current) return;
    const text = session.finish();
    if (text === null) return;
    clearTimers();
    if (text) callbacks.current.onTranscript(text);
    setStatus('idle');
    setDuration(0);
  }, [clearTimers, session]);

  const handleError = useCallback((event: { error: string; message?: string }) => {
    if (!session.active) return;
    logger.warn('[VoiceToText] Recognition stopped', { code: event.error });
    const message = event.error === 'no-speech'
      ? 'No speech was detected. Check your microphone input and try again.'
      : event.error === 'audio-capture'
        ? 'The microphone could not start. Check microphone access and try again.'
        : event.message || 'Speech recognition stopped. Please try again.';
    fail(message);
  }, [fail, session]);

  if (useSpeechRecognitionEvent) {
    // The native-module availability is fixed for this app build.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useSpeechRecognitionEvent('audiostart', handleAudioStart);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useSpeechRecognitionEvent('result', handleResult);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useSpeechRecognitionEvent('volumechange', handleVolume);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useSpeechRecognitionEvent('end', handleEnd);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useSpeechRecognitionEvent('error', handleError);
  }

  const start = useCallback(async () => {
    if (session.active || pendingStart.current) return;
    if (!SpeechModule) { fail('Voice typing needs the latest app build.'); return; }
    pendingStart.current = true;
    setStatus('starting');
    try {
      const permission = await SpeechModule.requestPermissionsAsync();
      if (!mounted.current || !pendingStart.current) return;
      pendingStart.current = false;
      if (!isPermissionGranted(permission)) {
        setStatus('idle');
        callbacks.current.onPermissionDenied?.(permission);
        return;
      }
      session.begin();
      setLevels(session.levels);
      setDuration(0);
      startupTimer.current = setTimeout(() => {
        if (session.active && !session.capturing) {
          fail('The microphone did not start. Please try again.');
          SpeechModule?.abort();
        }
      }, 8000);
      SpeechModule.start({
        lang: 'en-US',
        interimResults: true,
        maxAlternatives: 1,
        continuous: callbacks.current.continuous ?? false,
        requiresOnDeviceRecognition: false,
        addsPunctuation: true,
        volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
      });
    } catch (error) { fail(error instanceof Error ? error.message : 'Could not start speech recognition.'); }
  }, [fail, session]);

  const stop = useCallback(() => { if (session.active) SpeechModule?.stop(); }, [session]);
  const cancel = useCallback(() => {
    const wasActive = session.active;
    session.cancel();
    pendingStart.current = false;
    clearTimers();
    if (wasActive) SpeechModule?.abort();
    if (mounted.current) { setStatus('idle'); setDuration(0); }
  }, [clearTimers, session]);

  return useMemo(() => ({
    status, isRecording: status === 'recording', isStarting: status === 'starting',
    isUnavailable: !_moduleAvailable, duration, levels, start, stop, cancel,
  }), [status, duration, levels, start, stop, cancel]);
}
