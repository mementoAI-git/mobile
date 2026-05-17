import { useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';

interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  uri: string | null;
}

export function useAudioRecorder() {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    uri: null,
  });

  const start = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') throw new Error('Microphone permission denied');

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      recording.setOnRecordingStatusUpdate((s) => {
        setState((prev) => ({ ...prev, duration: Math.floor((s.durationMillis ?? 0) / 1000) }));
      });

      await recording.startAsync();
      recordingRef.current = recording;
      setState((prev) => ({ ...prev, isRecording: true, uri: null }));
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }, []);

  const stop = useCallback(async (): Promise<string | null> => {
    const recording = recordingRef.current;
    if (!recording) return null;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;
      setState((prev) => ({ ...prev, isRecording: false, isPaused: false, uri: uri ?? null }));
      return uri ?? null;
    } catch (err) {
      console.error('Failed to stop recording', err);
      return null;
    }
  }, []);

  const cancel = useCallback(async () => {
    const recording = recordingRef.current;
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
    } catch {
      // ignore
    }
    recordingRef.current = null;
    setState({ isRecording: false, isPaused: false, duration: 0, uri: null });
  }, []);

  return { ...state, start, stop, cancel };
}
