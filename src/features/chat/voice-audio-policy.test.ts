import { describe, expect, test } from 'bun:test';

import { resolveVoiceAudioPolicy } from './voice-audio-policy';

describe('resolveVoiceAudioPolicy', () => {
  test('iOS voice processing is off unless explicitly enabled', () => {
    expect(
      resolveVoiceAudioPolicy({ platform: 'ios', fullDuplexRequested: false }),
    ).toEqual({ iosVoiceProcessing: false, speakerFullDuplex: false });
  });

  test('iOS never runs full duplex without echo cancellation', () => {
    expect(
      resolveVoiceAudioPolicy({ platform: 'ios', fullDuplexRequested: true }),
    ).toEqual({ iosVoiceProcessing: false, speakerFullDuplex: false });
    expect(
      resolveVoiceAudioPolicy({
        platform: 'ios',
        fullDuplexRequested: true,
        iosVoiceProcessingRequested: true,
      }),
    ).toEqual({ iosVoiceProcessing: true, speakerFullDuplex: true });
  });

  test('iOS voice processing alone keeps the speaker gate', () => {
    expect(
      resolveVoiceAudioPolicy({
        platform: 'ios',
        fullDuplexRequested: false,
        iosVoiceProcessingRequested: true,
      }),
    ).toEqual({ iosVoiceProcessing: true, speakerFullDuplex: false });
  });

  test('Android full duplex does not depend on the iOS setting', () => {
    expect(
      resolveVoiceAudioPolicy({ platform: 'android', fullDuplexRequested: true }),
    ).toEqual({ iosVoiceProcessing: false, speakerFullDuplex: true });
  });
});
