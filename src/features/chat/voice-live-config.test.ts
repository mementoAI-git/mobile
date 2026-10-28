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
      serverTools: [],
      voiceName: 'Fenrir',
    });
  });

  test('uses the one-release compatibility model for an older API response', () => {
    expect(parseVoiceLiveToken({ token: 'ephemeral' }, 'Aoede')).toEqual({
      token: 'ephemeral',
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      voiceName: 'Aoede',
      supportsVoiceTurns: false,
      serverTools: [],
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

  test('only names the voice: the token locks the real session config', () => {
    const config = buildGeminiLiveConfig('Fenrir');
    expect(config.speechConfig).toEqual({
      voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } },
    });
    expect(config.systemInstruction).toBeUndefined();
    expect(config.realtimeInputConfig).toBeUndefined();
    expect(config.inputAudioTranscription).toEqual({});
    expect(config.outputAudioTranscription).toEqual({});
  });

  test('names the selected conversation language when given', () => {
    expect(buildGeminiLiveConfig('Fenrir', 'fr-FR').speechConfig?.languageCode).toBe('fr-FR');
  });

  test('parses systemInstruction from ephemeral token payload', () => {
    const parsed = parseVoiceLiveToken({
      token: 'ephemeral',
      systemInstruction: 'HOST CONTEXT: Avery likes classical music and coffee.',
    }, 'Aoede');

    expect(parsed.systemInstruction).toBe('HOST CONTEXT: Avery likes classical music and coffee.');
  });

  test('parses tools and the speaker duplex policy when the API sends them', () => {
    const parsed = parseVoiceLiveToken(
      { token: 't', tools: ['search_memories', 7], speakerFullDuplex: false },
      'Fenrir',
    );

    expect(parsed.tools).toEqual(['search_memories']);
    expect(parsed.speakerFullDuplex).toBe(false);
    expect(parseVoiceLiveToken({ token: 't' }, 'Fenrir').speakerFullDuplex).toBeUndefined();
  });

  test('parses the turn detection the API locked into the session', () => {
    expect(
      parseVoiceLiveToken(
        {
          token: 't',
          turnDetection: { variant: 'silence-800', silenceDurationMs: 800, prefixPaddingMs: 200 },
        },
        'Fenrir',
      ).turnDetection,
    ).toEqual({ variant: 'silence-800', silenceDurationMs: 800, prefixPaddingMs: 200 });
    expect(
      parseVoiceLiveToken({ token: 't', turnDetection: { silenceDurationMs: 'x' } }, 'Fenrir')
        .turnDetection,
    ).toEqual({ variant: undefined, silenceDurationMs: undefined, prefixPaddingMs: undefined });
    expect(parseVoiceLiveToken({ token: 't' }, 'Fenrir').turnDetection).toBeUndefined();
  });

  test('lists the server tools to forward, dropping malformed names', () => {
    const token = parseVoiceLiveToken(
      {
        token: 't',
        serverTools: ['update_profile', 'open_story', 42, '../../x', 'UPPER'],
      },
      'Aoede',
    );
    expect(token.serverTools).toEqual(['update_profile', 'open_story']);
  });
});

