import { describe, expect, test } from 'bun:test';
import {
  buildGeminiLiveConfig,
  parseVoiceLiveToken,
} from './voice-live-config';

describe('voice Live configuration', () => {
  test('uses the API model and voice', () => {
    expect(parseVoiceLiveToken({
      token: 'ephemeral',
      live: {
        model: 'gemini-3.8-live',
        voice: { id: 'denver', name: 'Fenrir', provider: 'gemini' },
      },
    }, 'Aoede')).toEqual({
      token: 'ephemeral',
      model: 'gemini-3.8-live',
      voiceName: 'Fenrir',
    });
  });

  test('uses the one-release compatibility model for an older API response', () => {
    expect(parseVoiceLiveToken({ token: 'ephemeral' }, 'Aoede')).toEqual({
      token: 'ephemeral',
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      voiceName: 'Aoede',
    });
  });

  test('rejects a missing token', () => {
    expect(() => parseVoiceLiveToken({}, 'Aoede')).toThrow(
      'Voice session token was not returned',
    );
  });

  test('configures conservative automatic turn detection', () => {
    expect(buildGeminiLiveConfig('Fenrir')).toMatchObject({
      realtimeInputConfig: {
        automaticActivityDetection: {
          disabled: false,
          prefixPaddingMs: 40,
          silenceDurationMs: 650,
        },
      },
    });
  });
});
