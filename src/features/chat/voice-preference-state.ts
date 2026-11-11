import { parseVoiceLanguage, type VoiceLanguageCode } from './voice-language';
import { getVoiceById, getVoiceByProviderName, type VoiceId } from './voice-catalog';
import type { StateCreator } from 'zustand';

export interface VoicePreferenceStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface VoicePreferenceState {
  selectedVoiceId: VoiceId | null;
  languageCode: VoiceLanguageCode;
  selectLanguage(code: VoiceLanguageCode): Promise<void>;
  /** Save voice conversations as stories, with their audio. On unless turned off. */
  recordConversations: boolean;
  setRecordConversations(enabled: boolean): Promise<void>;
  hydratedForUser: string | null;
  isHydrating: boolean;
  hydrate(userKey: string): Promise<void>;
  selectVoice(voiceId: VoiceId): Promise<void>;
  reset(): void;
}

export function getVoicePreferenceStorageKey(userKey: string) {
  return `memento.voice-preference.${userKey}`;
}

/** Recording is on by default: only an explicit "false" turns it off. */
export function parseRecordConversations(raw: string | null): boolean {
  return raw !== 'false';
}

export function parseVoicePreference(raw: string | null): VoiceId | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (typeof value === 'string') {
      return getVoiceById(value)?.id ?? getVoiceByProviderName(value)?.id ?? null;
    }
    return null;
  } catch {
    return getVoiceById(raw)?.id ?? getVoiceByProviderName(raw)?.id ?? null;
  }
}

export function createVoicePreferenceState(
  storage: VoicePreferenceStorage,
): StateCreator<VoicePreferenceState> {
  let hydrationRequest = 0;
  return (set, get) => ({
    selectedVoiceId: null,
    languageCode: 'en-US',
    recordConversations: true,
    hydratedForUser: null,
    isHydrating: false,
    hydrate: async (userKey) => {
      const request = ++hydrationRequest;
      set({ isHydrating: true, selectedVoiceId: null, languageCode: 'en-US', recordConversations: true, hydratedForUser: null });
      const [raw, language, record] = await Promise.all([
        storage.getItem(getVoicePreferenceStorageKey(userKey)).catch(() => null),
        storage.getItem(`${getVoicePreferenceStorageKey(userKey)}.language`).catch(() => null),
        storage.getItem(`${getVoicePreferenceStorageKey(userKey)}.record`).catch(() => null),
      ]);
      if (request !== hydrationRequest) return;
      set({
        selectedVoiceId: parseVoicePreference(raw),
        languageCode: parseVoiceLanguage(language),
        recordConversations: parseRecordConversations(record),
        hydratedForUser: userKey,
        isHydrating: false,
      });
    },
    selectVoice: async (voiceId) => {
      const userKey = get().hydratedForUser;
      if (!userKey || !getVoiceById(voiceId)) return;
      set({ selectedVoiceId: voiceId });
      await storage.setItem(getVoicePreferenceStorageKey(userKey), JSON.stringify(voiceId));
    },
    selectLanguage: async (code) => {
      const userKey = get().hydratedForUser;
      if (!userKey || parseVoiceLanguage(code) !== code) return;
      await storage.setItem(`${getVoicePreferenceStorageKey(userKey)}.language`, code);
      if (get().hydratedForUser === userKey) set({ languageCode: code });
    },
    setRecordConversations: async (enabled) => {
      const userKey = get().hydratedForUser;
      if (!userKey) return;
      set({ recordConversations: enabled });
      await storage.setItem(`${getVoicePreferenceStorageKey(userKey)}.record`, String(enabled));
    },
    reset: () => {
      hydrationRequest += 1;
      set({ selectedVoiceId: null, languageCode: 'en-US', recordConversations: true, hydratedForUser: null, isHydrating: false });
    },
  });
}
