export type VoiceAudioPolicy = {
  /** Turn on Apple's voice-processing unit (echo cancellation) for the recorder. */
  iosVoiceProcessing: boolean;
  /** Keep the mic open while Memento speaks on the loudspeaker. */
  speakerFullDuplex: boolean;
};

/**
 * Decides the two voice audio settings together.
 *
 * iOS voice processing is off unless explicitly enabled (EAS testflight turns
 * it on; production does not yet). It once froze real iPhones: the audio
 * library rebuilt the engine for the configuration change that switching
 * voice processing posts, which switched it on again, in a main-thread loop
 * (TestFlight builds 19 and 20, crash code 0x8BADF00D). The patch in
 * patches/react-native-audio-api@*.patch breaks that loop by ignoring
 * configuration changes for a second after a switch. What still holds
 * production back is leftover echo at full speaker volume, not the freeze.
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
