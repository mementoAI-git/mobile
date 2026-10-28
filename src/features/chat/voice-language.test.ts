import { describe, expect, test } from 'bun:test';
import { createStore } from 'zustand/vanilla';
import { VOICE_LANGUAGES, parseVoiceLanguage, voiceLanguageInstruction } from './voice-language';
import { createVoicePreferenceState } from './voice-preference-state';

describe('voice language selection', () => {
  test('offers exactly the web language list', async () => {
    expect(VOICE_LANGUAGES.map(language => [language.code, language.label])).toEqual([
      ['en-US', 'English'], ['zh-CN', 'Mandarin Chinese'], ['hi-IN', 'Hindi'],
      ['es-ES', 'Spanish'], ['fr-FR', 'French'], ['ar-SA', 'Arabic'], ['bn-BD', 'Bengali'],
    ]);
    for (const language of VOICE_LANGUAGES) {
      expect(voiceLanguageInstruction(language.code)).toContain(`Respond aloud in ${language.label}`);
    }
    expect(VOICE_LANGUAGES).toHaveLength(7);
    expect(parseVoiceLanguage('unknown')).toBe('en-US');
  });
  test('persists language per account without changing the selected voice', async () => {
    const values = new Map<string, string>([['memento.voice-preference.a', '"denver"']]);
    const store = createStore(createVoicePreferenceState({ getItem: async key => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); } }));
    await store.getState().hydrate('a');
    await store.getState().selectLanguage('fr-FR');
    await store.getState().hydrate('b');
    expect(store.getState().languageCode).toBe('en-US');
    await store.getState().hydrate('a');
    expect(store.getState()).toMatchObject({ selectedVoiceId: 'denver', languageCode: 'fr-FR' });
    store.getState().reset();
    expect(store.getState().languageCode).toBe('en-US');
  });
});
