import { useState, useRef, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';

interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  uri: string | null;
}

export function useAudioRecorder() {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const isMountedRef = useRef(true);
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    uri: null,
  });

  const unloadRecording = useCallback(async () => {
    const recording = recordingRef.current;
    if (!recording) return;

    recording.setOnRecordingStatusUpdate(null);
    recordingRef.current = null;

    try {
      await recording.stopAndUnloadAsync();
    } catch {
      // Recording may already be stopped/unloaded.
    }
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      void unloadRecording();
    };
  }, [unloadRecording]);

  const start = useCallback(async () => {
    try {
      await unloadRecording();

      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') throw new Error('Microphone permission denied');
      if (!isMountedRef.current) return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      if (!isMountedRef.current) return;

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      if (!isMountedRef.current) {
        await recording.stopAndUnloadAsync().catch(() => undefined);
        return;
      }

      recording.setOnRecordingStatusUpdate((s) => {
        if (!isMountedRef.current) return;
        setState((prev) => ({ ...prev, duration: Math.floor((s.durationMillis ?? 0) / 1000) }));
      });

      await recording.startAsync();
      if (!isMountedRef.current) {
        recording.setOnRecordingStatusUpdate(null);
        await recording.stopAndUnloadAsync().catch(() => undefined);
        return;
      }

      recordingRef.current = recording;
      setState((prev) => ({ ...prev, isRecording: true, uri: null }));
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }, [unloadRecording]);

  const stop = useCallback(async (): Promise<string | null> => {
    const recording = recordingRef.current;
    if (!recording) return null;
    try {
      recording.setOnRecordingStatusUpdate(null);
      recordingRef.current = null;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (isMountedRef.current) {
        setState((prev) => ({ ...prev, isRecording: false, isPaused: false, uri: uri ?? null }));
      }
      return uri ?? null;
    } catch (err) {
      console.error('Failed to stop recording', err);
      if (isMountedRef.current) {
        setState((prev) => ({ ...prev, isRecording: false, isPaused: false }));
      }
      return null;
    }
  }, []);

  const cancel = useCallback(async () => {
    await unloadRecording();
    if (isMountedRef.current) {
      setState({ isRecording: false, isPaused: false, duration: 0, uri: null });
    }
  }, [unloadRecording]);

  return { ...state, start, stop, cancel };
}
