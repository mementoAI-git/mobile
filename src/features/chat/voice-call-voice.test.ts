import { describe, expect, test } from 'bun:test';

import { getVoiceById } from './voice-catalog';
import { profileUsesVoice, saveCallVoice, savedCallVoice, voiceProfileUpdate } from './voice-call-voice';

const sue = getVoiceById('sue')!;

describe('profileUsesVoice', () => {
  // Mirrors the API's resolveGeminiVoiceName: persona id or Gemini voice name,
  // any case, and only for the gemini provider (or none set).
  test('matches the persona id or the Gemini voice name, in any case', () => {
    expect(profileUsesVoice({ chat_voice: 'Aoede', chat_voice_provider: 'gemini' }, sue)).toBe(true);
    expect(profileUsesVoice({ chat_voice: 'aoede' }, sue)).toBe(true);
    expect(profileUsesVoice({ chat_voice: 'sue', chat_voice_provider: null }, sue)).toBe(true);
  });

  test('does not match another voice, a missing voice, or another provider', () => {
    expect(profileUsesVoice({ chat_voice: 'Fenrir', chat_voice_provider: 'gemini' }, sue)).toBe(false);
    expect(profileUsesVoice({ chat_voice: null }, sue)).toBe(false);
    expect(profileUsesVoice(undefined, sue)).toBe(false);
    expect(profileUsesVoice({ chat_voice: 'Aoede', chat_voice_provider: 'elevenlabs' }, sue)).toBe(false);
  });
});

describe('saveCallVoice', () => {
  test('saves the server profile first, then the local choice', async () => {
    const calls: string[] = [];

    await saveCallVoice(sue, {
      saveProfile: async (payload) => {
        calls.push(`profile:${JSON.stringify(payload)}`);
      },
      saveLocal: async (id) => {
        calls.push(`local:${id}`);
      },
    });

    expect(calls).toEqual([
      `profile:${JSON.stringify(voiceProfileUpdate(sue))}`,
      'local:sue',
    ]);
    expect(voiceProfileUpdate(sue)).toEqual({ chat_voice: 'Aoede', chat_voice_provider: 'gemini' });
  });

  test('keeps the local choice unchanged when the server save fails', async () => {
    const local: string[] = [];

    await expect(
      saveCallVoice(sue, {
        saveProfile: async () => {
          throw new Error('offline');
        },
        saveLocal: async (id) => {
          local.push(id);
        },
      }),
    ).rejects.toThrow('offline');
    expect(local).toEqual([]);
  });
});

describe('savedCallVoice', () => {
  test('finds the saved voice by id or by Gemini name', () => {
    expect(savedCallVoice({ chat_voice: 'denver', chat_voice_provider: 'gemini' })?.id).toBe('denver');
    expect(savedCallVoice({ chat_voice: 'fenrir' })?.id).toBe('denver');
  });

  test('has no voice when none is saved, it is not ours, or another provider owns it', () => {
    expect(savedCallVoice(null)).toBeUndefined();
    expect(savedCallVoice({ chat_voice: '' })).toBeUndefined();
    expect(savedCallVoice({ chat_voice: 'nobody' })).toBeUndefined();
    expect(savedCallVoice({ chat_voice: 'denver', chat_voice_provider: 'elevenlabs' })).toBeUndefined();
  });
});
