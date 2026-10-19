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

  test('defaults to English while honoring the selected conversation language', () => {
    const config = buildGeminiLiveConfig('Fenrir');
    const instruction = (config.systemInstruction as { parts?: Array<{ text?: string }> })?.parts?.[0]?.text ?? '';

    expect(instruction).toContain('Respond aloud in English');
    const french = buildGeminiLiveConfig('Fenrir', null, undefined, 'fr-FR');
    expect(JSON.stringify(french.systemInstruction)).toContain('Respond aloud in French');
    expect(french.speechConfig?.languageCode).toBe('fr-FR');
    expect(config.speechConfig?.languageCode).toBe('en-US');
    expect(config.inputAudioTranscription).toEqual({});
    expect(config.outputAudioTranscription).toEqual({});
  });

  test('incorporates the user nickname into the personalized companion instruction', () => {
    const config = buildGeminiLiveConfig('Fenrir', { nickname: 'Avery' });
    const instruction = (config.systemInstruction as { parts?: Array<{ text?: string }> })?.parts?.[0]?.text ?? '';

    expect(instruction).toContain('speaking with "Avery"');
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

    expect(instruction).toContain('speaking with "Avery"');
    expect(instruction).toContain('STORED CONTEXT: Visited Tokyo in 2024.');
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

