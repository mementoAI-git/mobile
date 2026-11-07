import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { normalizeDigitalMind, type DigitalMindProfile } from '@/features/chat/digital-mind';
interface DigitalMindState {
  profiles: Record<string, DigitalMindProfile>;
  save: (userId: string, profile: DigitalMindProfile) => void;
}
/** Device-persisted preferences per account; the chosen name accompanies AI requests. */
export const useDigitalMindStore = create<DigitalMindState>()(persist(set => ({
  profiles: {},
  save: (userId, profile) => {
    if (!userId) return;
    set(state => ({ profiles: { ...state.profiles, [userId]: normalizeDigitalMind(profile) } }));
  },
}), {
  name: 'memento.digital-mind',
  storage: createJSONStorage(() => AsyncStorage),
  partialize: state => ({ profiles: state.profiles }),
}));
