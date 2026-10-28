import { RecordingPresets, type RecordingOptions } from 'expo-audio';

/** Mono speech capture: smaller uploads without transcoding after Stop. */
export const STORY_RECORDING_OPTIONS: RecordingOptions = {
  directory: 'document',
  ...RecordingPresets.HIGH_QUALITY,
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 32000,
  isMeteringEnabled: true,
};
