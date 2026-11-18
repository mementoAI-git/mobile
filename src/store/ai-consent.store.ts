import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AI_CONSENT_VERSION, type AiConsentMap } from '@/features/chat/ai-consent';

interface AiConsentState {
  /** Acceptance of the AI data disclosure, per account id, kept on this device. */
  accepted: AiConsentMap;
  accept: (userId: string) => void;
}

export const useAiConsentStore = create<AiConsentState>()(persist(set => ({
  accepted: {},
  accept: (userId) => {
    if (!userId) return;
    set(state => ({
      accepted: {
        ...state.accepted,
        [userId]: { version: AI_CONSENT_VERSION, acceptedAt: new Date().toISOString() },
      },
    }));
  },
}), {
  name: 'memento.consent.ai-data',
  storage: createJSONStorage(() => AsyncStorage),
  partialize: state => ({ accepted: state.accepted }),
}));
