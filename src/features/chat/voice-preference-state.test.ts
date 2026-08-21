import { describe, expect, test } from 'bun:test';
import {
  createVoicePreferenceState,
  getVoicePreferenceStorageKey,
  parseVoicePreference,
} from './voice-preference-state';
import { createStore } from 'zustand/vanilla';

describe('voice preference persistence', () => {
  test('scopes the preference to the authenticated account', () => {
    expect(getVoicePreferenceStorageKey('user-1')).toBe('memento.voice-preference.user-1');
    expect(getVoicePreferenceStorageKey('user-2')).not.toBe(getVoicePreferenceStorageKey('user-1'));
  });

  test('restores only catalog voice identifiers', () => {
    expect(parseVoicePreference(null)).toBeNull();
    expect(parseVoicePreference('"hannah"')).toBe('hannah');
    expect(parseVoicePreference('"not-a-voice"')).toBeNull();
    expect(parseVoicePreference('{broken')).toBeNull();
  });

  test('hydrates and persists selection only for the active account', async () => {
    const writes: Array<[string, string]> = [];
    const storage = {
      getItem: async () => '"maya"',
      setItem: async (key: string, value: string) => { writes.push([key, value]); },
    };
    const store = createStore(createVoicePreferenceState(storage));

    await store.getState().hydrate('user-1');
    expect(store.getState()).toMatchObject({ selectedVoiceId: 'maya', hydratedForUser: 'user-1' });
    await store.getState().selectVoice('leo');
    expect(writes).toEqual([['memento.voice-preference.user-1', '"leo"']]);
  });
});
