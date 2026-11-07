import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { toggleMessageReaction } from '@/features/chat/message-actions';

interface MessageReactionsState {
  reactions: Record<string, string>;
  react: (key: string, emoji: string) => void;
}

/** Device-local preferences until the chat API exposes reactions. Keys include the account. */
export const useMessageReactionsStore = create<MessageReactionsState>()(persist((set) => ({
  reactions: {},
  react: (key, emoji) => set((state) => {
    const reactions = { ...state.reactions };
    const next = toggleMessageReaction(reactions[key], emoji);
    if (next) reactions[key] = next;
    else delete reactions[key];
    return { reactions };
  }),
}), {
  name: 'memento.message-reactions',
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (state) => ({ reactions: state.reactions }),
}));
