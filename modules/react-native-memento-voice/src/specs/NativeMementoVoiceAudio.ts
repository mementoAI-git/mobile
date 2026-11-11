'use strict';

import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

interface Spec extends TurboModule {
  install(): boolean;
  /**
   * Whether Apple's voice-processing unit (echo cancellation) is actually
   * engaged on the live microphone input. Always false on Android, which has
   * no equivalent switch (echo cancellation comes from the voiceCommunication
   * input preset).
   */
  isVoiceProcessingActive(): boolean;
  /**
   * Converts a call recording WAV to AAC M4A (mono, 16 kHz, ~32 kbps) beside
   * it with the same name, deletes the WAV, and resolves the M4A path.
   * iOS only: Android rejects with code E_UNSUPPORTED and leaves the WAV.
   */
  convertRecordingToM4A(wavPath: string): Promise<string>;
}

export default TurboModuleRegistry.get<Spec>('MementoVoiceAudio');