import { getVoiceById, getVoiceByProviderName, type VoiceId } from './voice-catalog';
import type { StateCreator } from 'zustand';

export interface VoicePreferenceStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface VoicePreferenceState {
  selectedVoiceId: VoiceId | null;
  hydratedForUser: string | null;
  isHydrating: boolean;
  hydrate(userKey: string): Promise<void>;
  selectVoice(voiceId: VoiceId): Promise<void>;
  reset(): void;
}

export function getVoicePreferenceStorageKey(userKey: string) {
  return `memento.voice-preference.${userKey}`;
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
    hydratedForUser: null,
    isHydrating: false,
    hydrate: async (userKey) => {
      const request = ++hydrationRequest;
      set({ isHydrating: true, selectedVoiceId: null, hydratedForUser: null });
      const raw = await storage.getItem(getVoicePreferenceStorageKey(userKey)).catch(() => null);
      if (request !== hydrationRequest) return;
      set({
        selectedVoiceId: parseVoicePreference(raw),
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
    reset: () => {
      hydrationRequest += 1;
      set({ selectedVoiceId: null, hydratedForUser: null, isHydrating: false });
    },
  });
}
