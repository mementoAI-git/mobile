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
}

export default TurboModuleRegistry.get<Spec>('MementoVoiceAudio');