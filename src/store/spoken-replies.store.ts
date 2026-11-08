import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SpokenRepliesState {
  /** Read new chat replies aloud (web "Voice narration"). */
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  toggle: () => void;
}

export const useSpokenRepliesStore = create<SpokenRepliesState>()(persist((set, get) => ({
  enabled: false,
  setEnabled: (enabled) => set({ enabled }),
  toggle: () => set({ enabled: !get().enabled }),
}), {
  name: 'memento.spoken-replies',
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (state) => ({ enabled: state.enabled }),
}));
