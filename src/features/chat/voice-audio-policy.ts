export type VoiceAudioPolicy = {
  /** Turn on Apple's voice-processing unit (echo cancellation) for the recorder. */
  iosVoiceProcessing: boolean;
  /** Keep the mic open while Memento speaks on the loudspeaker. */
  speakerFullDuplex: boolean;
};

/**
 * Decides the two voice audio settings together.
 *
 * iOS voice processing is off unless explicitly enabled. Turning it on makes
 * the audio library re-initialize Apple's voice-processing unit on the main
 * thread whenever iOS reports an engine configuration change, and on real
 * iPhones that call hung, freezing the app until iOS killed it (TestFlight
 * builds 19 and 20, crash code 0x8BADF00D in setVoiceProcessingEnabled).
 *
 * Full duplex on the loudspeaker needs echo cancellation, so on iOS it is
 * only allowed when voice processing is on. Otherwise the speaker gate mutes
 * the mic while Memento speaks, and Memento can't hear itself.
 */
export function resolveVoiceAudioPolicy({
  platform,
  fullDuplexRequested,
  iosVoiceProcessingRequested = false,
}: {
  platform: string;
  fullDuplexRequested: boolean;
  iosVoiceProcessingRequested?: boolean;
}): VoiceAudioPolicy {
  if (platform !== 'ios') {
    return { iosVoiceProcessing: false, speakerFullDuplex: fullDuplexRequested };
  }
  return {
    iosVoiceProcessing: iosVoiceProcessingRequested,
    speakerFullDuplex: fullDuplexRequested && iosVoiceProcessingRequested,
  };
}
