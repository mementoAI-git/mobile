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
      // Stop recording on unmount if still active
      if (recorder.isRecording) {
        recorder.stop().catch(() => undefined);
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
    if (!recorder.isRecording) return null;
    try {
      await recorder.stop();
      // recorder.uri is populated after stop()
      return recorder.uri ?? null;
    } catch (err) {
      console.error('Failed to stop recording', err);
      return null;
    }
  }, [recorder]);

  const cancel = useCallback(async () => {
    if (recorder.isRecording) {
      await recorder.stop().catch(() => undefined);
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
