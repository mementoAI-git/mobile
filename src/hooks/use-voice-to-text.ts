import { useState, useRef, useCallback, useEffect } from 'react';
import { logger } from '@/lib/logger';

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

export type VoiceToTextStatus = 'idle' | 'recording' | 'error';

export interface UseVoiceToTextResult {
  status: VoiceToTextStatus;
  isRecording: boolean;
  /** true when the native speech module is unavailable (Expo Go) */
  isUnavailable: boolean;
  /** Elapsed seconds since recording started */
  duration: number;
  /** Begin live speech recognition — partial results stream via onPartial */
  start: () => Promise<void>;
  /** Finish recognition — fires onTranscript with the final committed text */
  stop: () => void;
  /** Cancel without committing any text */
  cancel: () => void;
}

export interface UseVoiceToTextOptions {
  /**
   * Called continuously with live partial text as the user speaks.
   * Use this to update your TextInput value in real time.
   */
  onPartial: (text: string) => void;
  /**
   * Called once with the final committed text when recognition ends
   * (either stop() was called or the OS stopped listening).
   */
  onTranscript: (text: string) => void;
  /** Called on a real recognition error (silence is NOT an error). */
  onError?: (err: Error) => void;
}

/**
 * useVoiceToText — on-device live speech-to-text using iOS Speech framework.
 *
 * Architecture:
 *  - Uses expo-speech-recognition (wraps Apple Speech / Android SpeechRecognizer)
 *  - NO audio file, NO server upload, NO race conditions
 *  - Partial results stream instantly into the TextInput via onPartial
 *  - Final committed text delivered via onTranscript when done
 *  - Gracefully degrades to a no-op in Expo Go (native module not available)
 *
 * Usage in ChatInput:
 *   const { isRecording, isUnavailable, start, stop } = useVoiceToText({
 *     onPartial: (live) => setText(textBeforeDictation + live),
 *     onTranscript: (final) => setText(textBeforeDictation + final),
 *   });
 */
export function useVoiceToText({
  onPartial,
  onTranscript,
  onError,
}: UseVoiceToTextOptions): UseVoiceToTextResult {
  const [status, setStatus] = useState<VoiceToTextStatus>('idle');
  const [duration, setDuration] = useState(0);

  const isMountedRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Text that has been confirmed final during this dictation session.
  const committedRef = useRef('');

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ─── Recognition event listeners ─────────────────────────────────────────
  // We always call the hook unconditionally (Rules of Hooks) but guard the
  // callback body so it no-ops when the module is unavailable.

  const noop = useCallback(() => {}, []);

  const handleResult = useCallback(
    (event: any) => {
      if (!isMountedRef.current || !_moduleAvailable) return;
      const segment: string = event.results?.[0]?.transcript ?? '';
      if (event.isFinal) {
        committedRef.current = committedRef.current
          ? `${committedRef.current} ${segment}`
          : segment;
        onPartial(committedRef.current);
      } else {
        const live = committedRef.current
          ? `${committedRef.current} ${segment}`
          : segment;
        onPartial(live);
      }
    },
    [onPartial],
  );

  const handleEnd = useCallback(() => {
    if (!isMountedRef.current) return;
    clearTimer();
    const final = committedRef.current.trim();
    committedRef.current = '';
    if (final) onTranscript(final);
    setStatus('idle');
    setDuration(0);
  }, [clearTimer, onTranscript]);

  const handleError = useCallback(
    (event: any) => {
      if (!isMountedRef.current) return;
      clearTimer();
      committedRef.current = '';
      if (event?.error === 'no-speech') {
        setStatus('idle');
        setDuration(0);
        return;
      }
      setStatus('error');
      setDuration(0);
      setTimeout(() => {
        if (isMountedRef.current) setStatus('idle');
      }, 2000);
      onError?.(
        new Error(event?.message ?? event?.error ?? 'Speech recognition error'),
      );
    },
    [clearTimer, onError],
  );

  // Conditionally register event listeners only when module is available.
  // We must call the hook unconditionally — so we pass a no-op when unavailable.
  if (useSpeechRecognitionEvent) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useSpeechRecognitionEvent('result', _moduleAvailable ? handleResult : noop);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useSpeechRecognitionEvent('end', _moduleAvailable ? handleEnd : noop);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useSpeechRecognitionEvent('error', _moduleAvailable ? handleError : noop);
  }

  // ─────────────────────────────────────────────────────────────────────────

  const start = useCallback(async () => {
    if (!_moduleAvailable || !SpeechModule) {
      logger.warn('[VoiceToText] ExpoSpeechRecognition not available. Use a dev build.');
      return;
    }
    if (status !== 'idle') return;
    try {
      const { granted } = await SpeechModule.requestPermissionsAsync();
      if (!granted) throw new Error('Microphone permission denied');
      if (!isMountedRef.current) return;

      committedRef.current = '';

      SpeechModule.start({
        lang: 'en-US',
        interimResults: true,
        maxAlternatives: 1,
        continuous: false,
        requiresOnDeviceRecognition: false,
      });

      setStatus('recording');
      setDuration(0);
      timerRef.current = setInterval(() => {
        if (isMountedRef.current) setDuration((d) => d + 1);
      }, 1000);
    } catch (err: any) {
      committedRef.current = '';
      if (isMountedRef.current) setStatus('error');
      setTimeout(() => {
        if (isMountedRef.current) setStatus('idle');
      }, 2000);
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }, [status, onError]);

  const stop = useCallback(() => {
    if (!_moduleAvailable || !SpeechModule) return;
    SpeechModule.stop();
  }, []);

  const cancel = useCallback(() => {
    committedRef.current = '';
    clearTimer();
    if (_moduleAvailable && SpeechModule) {
      SpeechModule.abort();
    }
    if (isMountedRef.current) {
      setStatus('idle');
      setDuration(0);
    }
  }, [clearTimer]);

  return {
    status,
    isRecording: status === 'recording',
    isUnavailable: !_moduleAvailable,
    duration,
    start,
    stop,
    cancel,
  };
}
