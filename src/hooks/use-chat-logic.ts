import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { useConversationMessages } from '@/hooks/queries/use-memories';
import { useMemoryByPrompt } from '@/hooks/queries/use-prompts';
import { useStartConversation } from '@/hooks/mutations/use-memory-mutations';
import { useStreamChat } from '@/hooks/use-stream-chat';
import { useEnrichmentStats } from '@/hooks/use-enrichment-stats';
import { useUiStore } from '@/store';
import { queryKeys } from '@/constants/query-keys';
import type { ChatMode, LifeDimension } from '@/constants/enrichment';
import type { ChatReplyQuote } from '@/lib/utils';

export function useChatLogic() {
  const { id, type, promptTitle } = useLocalSearchParams<{ id: string; type?: string; promptTitle?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const openSheet = useUiStore((s) => s.openSheet);

  // ── Chat mode (open vs deep_dive) ────────────────────────────────────────
  const [chatMode, setChatMode] = useState<ChatMode>('open');
  const [deepDiveDimension, setDeepDiveDimension] = useState<LifeDimension | null>(null);

  const isPromptType = type === 'prompt';
  const { data: promptMemoryRes, isLoading: isLoadingPromptMemory } = useMemoryByPrompt(
    isPromptType ? id : '',
  );

  const promptMemory = promptMemoryRes?.data;

  // Treat the literal string 'new' as no ID — the conversation hasn't been created yet.
  // Passing 'new' as a memory_id to the AI endpoint or the messages query causes backend errors.
  const activeChatId = isPromptType
    ? (promptMemory?._id ?? null)
    : (id && id !== 'new' ? id : null);

  const { data: serverMessages, isLoading: isLoadingMessages } = useConversationMessages(
    activeChatId ?? '',
  );

  const { messages, streaming, streamingText, send: streamSend, abort: stop } = useStreamChat(
    activeChatId ?? undefined,
  );

  // ── Enrichment stats (refetched after each AI response) ─────────────────
  const enrichmentStats = useEnrichmentStats();

  // Merge and reverse for inverted FlatList (index 0 = bottom)
  const allMessages = useMemo(
    () => [
      ...(serverMessages?.messages ?? []),
      ...messages,
    ].reverse(),
    [serverMessages?.messages, messages],
  );

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    // The HostChatEntryScreen uses router.replace() → clears back stack.
    // Must guard before calling back() or it throws GO_BACK not handled.
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/overview');
    }
  }, [router]);

  const handleActions = useCallback(() => {
    Haptics.selectionAsync();
    openSheet('chat-actions', {
      chatId: activeChatId || '',
      chatMode,
      deepDiveDimension,
      enrichmentStats: enrichmentStats.stats,
      onSetChatMode: (mode: ChatMode, dimension?: LifeDimension | null) => {
        setChatMode(mode);
        setDeepDiveDimension(dimension ?? null);
      },
    });
  }, [activeChatId, chatMode, deepDiveDimension, enrichmentStats.stats, openSheet]);

  const send = useCallback(
    async (text: string, replyTo?: ChatReplyQuote | null, attachments?: string[]) => {
      await streamSend(text, { replyTo, chatMode, deepDiveDimension, attachments });
    },
    [streamSend, chatMode, deepDiveDimension],
  );

  // Refetch enrichment stats after each AI response to update delta + milestones
  const prevMessagesLengthRef = useRef(messages.length);
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (
      messages.length > prevMessagesLengthRef.current &&
      lastMessage?.role === 'ai'
    ) {
      queryClient.invalidateQueries({ queryKey: queryKeys.userStats });
    }
    prevMessagesLengthRef.current = messages.length;
    // messages.length is derived from messages — listing both causes a double-trigger.
    // Only depend on `messages` (the array reference changes when length changes).
  }, [messages, queryClient]);

  const handleEnterDeepDive = useCallback((dimension: LifeDimension) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setChatMode('deep_dive');
    setDeepDiveDimension(dimension);
  }, []);

  const handleExitDeepDive = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChatMode('open');
    setDeepDiveDimension(null);
  }, []);

  const isLoading = isLoadingMessages || (isPromptType && isLoadingPromptMemory);

  return {
    id,
    activeChatId,
    isPromptType,
    promptMemory,
    /** Prompt question text passed via URL param — available immediately before API resolves */
    promptTitle: promptTitle ?? promptMemory?.title ?? null,
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
    // Chat mode
    chatMode,
    deepDiveDimension,
    handleEnterDeepDive,
    handleExitDeepDive,
    // Enrichment
    enrichmentStats,
  };
}
