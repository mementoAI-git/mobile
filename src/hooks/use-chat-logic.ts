import { useEffect, useRef } from 'react';
import { FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useConversationMessages } from '@/hooks/queries/use-memories';
import { useMemoryByPrompt } from '@/hooks/queries/use-prompts';
import { useStartConversation } from '@/hooks/mutations/use-memory-mutations';
import { useStreamChat } from '@/hooks/use-stream-chat';
import { useUiStore } from '@/store';

export function useChatLogic() {
  const { id, type } = useLocalSearchParams<{ id: string; type?: string }>();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const openSheet = useUiStore((s) => s.openSheet);

  const isPromptType = type === 'prompt';
  const { data: promptMemoryRes, isLoading: isLoadingPromptMemory } = useMemoryByPrompt(
    isPromptType ? id : '',
  );

  const promptMemory = promptMemoryRes?.data;
  const activeChatId = isPromptType ? (promptMemory?._id || null) : id;

  const { data: serverMessages, isLoading: isLoadingMessages } = useConversationMessages(
    activeChatId || '',
  );
  
  const { messages, streaming, streamingText, send: originalSend, abort: stop } = useStreamChat(
    activeChatId || undefined,
  );

  // Merge and reverse for inverted list (index 0 is bottom)
  const allMessages = [
    ...(serverMessages?.messages ?? []),
    ...messages,
  ].reverse();

  const handleBack = () => {
    Haptics.selectionAsync();
    router.back();
  };

  const handleActions = () => {
    Haptics.selectionAsync();
    openSheet('chat-actions', { chatId: activeChatId || '' });
  };

  const send = async (text: string) => {
    await originalSend(text);
  };

  const isLoading = isLoadingMessages || (isPromptType && isLoadingPromptMemory);

  return {
    id,
    activeChatId,
    isPromptType,
    promptMemory,
    isStartingConversation: false,
    router,
    flatListRef,
    serverMessages,
    isLoading,
    allMessages,
    streaming,
    streamingText,
    send,
    stop,
    handleBack,
    handleActions,
  };
}
