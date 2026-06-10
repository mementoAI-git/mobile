import { useRef, useCallback, useEffect } from 'react';
import {
  useAudioRecorder as useExpoAudioRecorder,
  AudioModule,
  RecordingPresets,
} from 'expo-audio';

export function useAudioRecorder() {
  // expo-audio's built-in recorder hook — replaces expo-av Audio.Recording
  const recorder = useExpoAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const isMountedRef = useRef(true);

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

  const start = useCallback(async () => {
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) throw new Error('Microphone permission denied');
      if (!isMountedRef.current) return;

      await AudioModule.setAudioModeAsync({
        // expo-audio uses allowsRecording (not the expo-av allowsRecordingIOS)
        allowsRecording: true,
        playsInSilentMode: true,
      });
      if (!isMountedRef.current) return;

      await recorder.record();
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }, [recorder]);

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
      console.error('Failed to stop recording', err);
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

  return {
    isRecording: recorder.isRecording,
    isPaused: false, // expo-audio doesn't expose pause on the recorder hook
    // currentTime is in seconds (number)
    duration: Math.floor(recorder.currentTime),
    uri: recorder.uri ?? null,
    start,
    stop,
    cancel,
  };
}
