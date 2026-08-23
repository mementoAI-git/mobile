import { useRef, useCallback, useEffect, useMemo } from 'react';
import {
  useAudioRecorder as useExpoAudioRecorder,
  AudioModule,
  RecordingPresets,
} from 'expo-audio';
import { logger } from '@/lib/logger';
import { isPermissionGranted, type PermissionLike } from '@/lib/permission-recovery';

interface UseAudioRecorderOptions {
  onPermissionDenied?: (permission: PermissionLike) => void;
  onError?: (err: unknown) => void;
}

export function useAudioRecorder(options: UseAudioRecorderOptions = {}) {
  // expo-audio's built-in recorder hook — replaces expo-av Audio.Recording
  const recorder = useExpoAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const isMountedRef = useRef(true);
  const { onPermissionDenied, onError } = options;

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Stop recording on unmount if still active.
      // Wrapped in try/catch because expo-audio's recorder is a native shared object
      // (AVAudioRecorder) that may already be deallocated by the time React runs
      // the cleanup, causing NativeSharedObjectNotFoundException on .isRecording access.
      try {
        if (recorder.isRecording) {
          recorder.stop().catch(() => undefined);
        }
      } catch {
        // Native object already gone — nothing to clean up
      }
    };
  // recorder is stable — the hook reference doesn't change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!isPermissionGranted(permission)) {
        onPermissionDenied?.(permission);
        return false;
      }
      if (!isMountedRef.current) return false;
      // expo-audio manages audio mode internally — no setAudioModeAsync needed
      await recorder.record();
      return true;
    } catch (err) {
      logger.error('Failed to start recording', err);
      onError?.(err);
      return false;
    }
  }, [onError, onPermissionDenied, recorder]);

  const stop = useCallback(async (): Promise<string | null> => {
    try {
      if (!recorder.isRecording) return null;
      await recorder.stop();
      // expo-audio's AudioRecorder is a native SharedObject — the `uri` property
      // is populated asynchronously via a native→JS event that fires after the
      // `stop()` promise resolves. Yielding one macrotask tick gives the native
      // layer time to write the URI before we read it back.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      return recorder.uri ?? null;
    } catch (err) {
      logger.error('Failed to stop recording', err);
      return null;
    }
  }, [recorder]);

  const cancel = useCallback(async () => {
    try {
      if (recorder.isRecording) {
        await recorder.stop().catch(() => undefined);
      }
    } catch {
      // Native object already gone
    }
  }, [recorder]);

  return useMemo(
    () => ({
      isRecording: recorder.isRecording,
      isPaused: false, // expo-audio doesn't expose pause on the recorder hook
      // currentTime is in seconds (number)
      duration: Math.floor(recorder.currentTime),
      uri: recorder.uri ?? null,
      start,
      stop,
      cancel,
    }),
    [recorder.isRecording, recorder.currentTime, recorder.uri, start, stop, cancel],
  );
}
