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
      supportsVoiceTurns: false,
      voiceName: 'Fenrir',
    });
  });

  test('uses the one-release compatibility model for an older API response', () => {
    expect(parseVoiceLiveToken({ token: 'ephemeral' }, 'Aoede')).toEqual({
      token: 'ephemeral',
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      voiceName: 'Aoede',
      supportsVoiceTurns: false,
    });
  });

  test('parses the server greeting, memory and turn support from the token payload', () => {
    const parsed = parseVoiceLiveToken(
      {
        token: 'auth_tokens/abc',
        live: { model: 'gemini-3.8-live', voice: { name: 'Kore' } },
        greetingInstruction: 'Greet Sam in one short sentence.',
        memoryId: '64b000000000000000000001',
        promptVersion: 'voice-2026-09-30',
      },
      'Fenrir',
    );

    expect(parsed.greetingInstruction).toBe('Greet Sam in one short sentence.');
    expect(parsed.memoryId).toBe('64b000000000000000000001');
    expect(parsed.supportsVoiceTurns).toBe(true);
  });

  test('older API responses leave greeting unset and do not claim turn support', () => {
    const parsed = parseVoiceLiveToken({ token: 'auth_tokens/abc', memoryId: null }, 'Fenrir');

    expect(parsed.greetingInstruction).toBeUndefined();
    expect(parsed.memoryId).toBeUndefined();
    expect(parsed.supportsVoiceTurns).toBe(false);
  });

  test('rejects a missing token', () => {
    expect(() => parseVoiceLiveToken({}, 'Aoede')).toThrow(
      'Voice session token was not returned',
    );
  });

  test('configures responsive automatic turn detection', () => {
    expect(buildGeminiLiveConfig('Fenrir')).toMatchObject({
      realtimeInputConfig: {
        automaticActivityDetection: {
          disabled: false,
          prefixPaddingMs: 20,
          silenceDurationMs: 800,
        },
      },
    });
  });

  test('locks the conversation exclusively to English via structured systemInstruction', () => {
    const config = buildGeminiLiveConfig('Fenrir');
    const instruction = (config.systemInstruction as { parts?: Array<{ text?: string }> })?.parts?.[0]?.text ?? '';

    expect(instruction).toContain('LANGUAGE DIRECTIVE: YOU MUST COMMUNICATE EXCLUSIVELY AND UNMISTAKABLY IN ENGLISH AT ALL TIMES.');
    expect(instruction).toContain('Under NO circumstances should you switch to or speak any other language');
    expect(config.speechConfig?.languageCode).toBe('en-US');
    expect(config.inputAudioTranscription).toEqual({});
    expect(config.outputAudioTranscription).toEqual({});
  });

  test('incorporates the user nickname into the personalized companion instruction', () => {
    const config = buildGeminiLiveConfig('Fenrir', { nickname: 'Avery' });
    const instruction = (config.systemInstruction as { parts?: Array<{ text?: string }> })?.parts?.[0]?.text ?? '';

    expect(instruction).toContain('speaking with Avery');
  });

  test('parses systemInstruction from ephemeral token payload', () => {
    const parsed = parseVoiceLiveToken({
      token: 'ephemeral',
      systemInstruction: 'HOST CONTEXT: Avery likes classical music and coffee.',
    }, 'Aoede');

    expect(parsed.systemInstruction).toBe('HOST CONTEXT: Avery likes classical music and coffee.');
  });

  test('appends rich user and memory context to live connect system instruction', () => {
    const config = buildGeminiLiveConfig('Fenrir', { nickname: 'Avery' }, 'STORED CONTEXT: Visited Tokyo in 2024.');
    const instruction = (config.systemInstruction as { parts?: Array<{ text?: string }> })?.parts?.[0]?.text ?? '';

    expect(instruction).toContain('speaking with Avery');
    expect(instruction).toContain('STORED CONTEXT: Visited Tokyo in 2024.');
  });
});
