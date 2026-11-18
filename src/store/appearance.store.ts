import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { DEFAULT_APPEARANCE, parseAppearance, type AppearancePreference } from '@/features/appearance/appearance';

const STORAGE_KEY = 'memento.appearance';
let revision = 0;
let writes: Promise<unknown> = Promise.resolve();

interface AppearanceState {
  preference: AppearancePreference;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setPreference: (preference: AppearancePreference) => void;
}

export const useAppearanceStore = create<AppearanceState>((set, get) => ({
  preference: DEFAULT_APPEARANCE,
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated) return;
    const currentRevision = revision;
    const saved = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
    if (currentRevision === revision) set({ preference: parseAppearance(saved) });
    set({ hydrated: true });
  },
  setPreference: (preference) => {
    revision += 1;
    set({ preference });
    // Serialize writes so rapid selections cannot persist an older choice last.
    writes = writes.catch(() => undefined).then(() => AsyncStorage.setItem(STORAGE_KEY, preference)).catch(() => undefined);
  },
}));
