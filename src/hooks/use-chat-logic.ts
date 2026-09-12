import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { FlashListRef } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import dayjs from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';
import { useConversationMessages, useMemories, useMemory } from '@/hooks/queries/use-memories';
import { useMemoryByPrompt } from '@/hooks/queries/use-prompts';
import { useStartConversation, useCreateMemory } from '@/hooks/mutations/use-memory-mutations';
import { useStreamChat } from '@/hooks/use-stream-chat';
import { useEnrichmentStats } from '@/hooks/use-enrichment-stats';
import { useProfile } from '@/hooks/queries/use-profile';
import { useUiStore, useAuthStore, useUserStore } from '@/store';
import { queryKeys } from '@/constants/query-keys';
import type { ChatMode, LifeDimension } from '@/constants/enrichment';
import type { ChatReplyQuote } from '@/lib/utils';
import type { IMessageAttachment } from '@/types';
import { resolveChatConversationId } from '@/features/chat/navigation';
import type { ChatListMessage } from '@/features/chat/message-list';
import {
  mergeConversationMessagePages,
  mergeAllConversationMessages,
} from '@/features/chat/conversation-pagination';

export function useChatLogic() {
  const { id, type, promptTitle } = useLocalSearchParams<{ id?: string; type?: string; promptTitle?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlashListRef<ChatListMessage>>(null);
  const openSheet = useUiStore((s) => s.openSheet);
  const userPrimaryConversationId = useUserStore((s) => s.user?.primary_conversation_id);
  const { data: profile, isLoading: isLoadingProfile } = useProfile();

  // ── Chat mode (open vs deep_dive) ────────────────────────────────────────
  const [chatMode, setChatMode] = useState<ChatMode>('open');
  const [deepDiveDimension, setDeepDiveDimension] = useState<LifeDimension | null>(null);

  const isPromptType = type === 'prompt';
  const { data: promptMemoryRes, isLoading: isLoadingPromptMemory } = useMemoryByPrompt(
    isPromptType ? (id ?? '') : '',
  );

  const promptMemory =
    promptMemoryRes?.data ??
    (promptMemoryRes?._id || promptMemoryRes?.id ? promptMemoryRes : null);

  const primaryChatId = profile?.primary_conversation_id ?? userPrimaryConversationId ?? null;

  const { data: memoriesData } = useMemories({ limit: 50 });
  const allUserMemories = useMemo(() => {
    return memoriesData?.pages?.flatMap((p) => p.docs) ?? [];
  }, [memoriesData]);

  const existingPromptMemory = useMemo(() => {
    if (!isPromptType) return null;
    return allUserMemories.find((c: any) => {
      if (id && id !== 'new' && (c.prompt === id || c.prompt?._id === id || c._id === id)) return true;
      if (promptTitle) {
        const normTitle = promptTitle.trim().toLowerCase();
        const normMemText = (c.prompt_text || c.title || '').trim().toLowerCase();
        if (normMemText === normTitle) return true;
      }
      return false;
    });
  }, [isPromptType, allUserMemories, id, promptTitle]);

  const isObjectId = Boolean(id && /^[0-9a-fA-F]{24}$/.test(id));
  // Prompt reflections have their own dedicated conversation memory separate from the primary host chat.
  // If no conversation memory exists for this prompt yet, activeChatId is null until created on first send.
  const activeChatId = isPromptType
    ? (existingPromptMemory?._id ?? promptMemory?._id ?? promptMemory?.id ?? (isObjectId ? id : null))
    : resolveChatConversationId(id, primaryChatId);

  const { data: memoryDetail } = useMemory(activeChatId ?? '');

  const {
    data: serverMessagePages,
    fetchNextPage: fetchOlderMessages,
    hasNextPage: hasOlderMessages,
    isFetchingNextPage: isFetchingOlderMessages,
    isLoading: isLoadingMessages,
  } = useConversationMessages(activeChatId ?? '');

  const { messages, streaming, streamingText, send: streamSend, abort: stop, clear: clearStreamMessages } = useStreamChat(
    activeChatId ?? undefined,
    isPromptType ? id : undefined,
  );

  // ── Enrichment stats (refetched after each AI response) ─────────────────
  const enrichmentStats = useEnrichmentStats();

  const baseMemoryMessages = useMemo(() => {
    const mem = memoryDetail || existingPromptMemory;
    if (!mem) return [];
    const msgs: ChatListMessage[] = [];
    if (mem.body && mem.body.trim()) {
      msgs.push({
        _id: `mem-body-${mem._id}`,
        role: 'user',
        text: mem.body,
        created_at: mem.created_at || new Date().toISOString(),
        attatchments: mem.attachments,
      });
    }
    return msgs;
  }, [memoryDetail, existingPromptMemory]);

  // FlashList v2 renders chronological data from the bottom without inversion.
  const persistedMessages = useMemo(
    () => {
      const msgs = mergeConversationMessagePages(serverMessagePages?.pages ?? []);
      if (msgs.length === 0 && baseMemoryMessages.length > 0) {
        return baseMemoryMessages;
      }
      return msgs;
    },
    [serverMessagePages?.pages, baseMemoryMessages],
  );
  const serverMessages = serverMessagePages?.pages[0];
  const allMessages = useMemo(
    () => mergeAllConversationMessages(persistedMessages, messages),
    [persistedMessages, messages],
  );

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/overview');
    }
  }, [router]);

  const handleActions = useCallback(() => {
    Haptics.selectionAsync();
    router.push({
      pathname: '/chat/settings',
      params: {
        chatId: activeChatId || '',
        enrichmentStats: JSON.stringify(enrichmentStats.stats || {}),
      },
    });
  }, [activeChatId, enrichmentStats.stats, router]);

  const { mutateAsync: startConversationMutation } = useStartConversation();
  const { mutateAsync: createMemoryMutation } = useCreateMemory();

  const send = useCallback(
    async (
      text: string,
      replyTo?: ChatReplyQuote | null,
      attachments?: string[],
      attachmentPreviews?: IMessageAttachment[],
    ) => {
      let targetChatId = activeChatId;

      // If no host conversation exists yet for host chat, initialize it on the backend
      if (!targetChatId && !isPromptType) {
        try {
          const res = await startConversationMutation({});
          const createdMemory = res?.data ?? res;
          const newId = (createdMemory as any)?.memory_id || createdMemory?._id || (createdMemory as any)?.id;
          if (newId) {
            targetChatId = newId;
            queryClient.invalidateQueries({ queryKey: queryKeys.profile });
            const currentUser = useUserStore.getState().user ?? useAuthStore.getState().user;
            if (currentUser) {
              const next = { ...currentUser, primary_conversation_id: newId };
              useUserStore.getState().setUser(next);
              useAuthStore.getState().updateUser(next);
            }
          }
        } catch {
          // fallback
        }
      }

      // If no conversation exists yet for a prompt reflection, initialize it on the backend
      if (!targetChatId && isPromptType) {
        try {
          const isStaticPromptId = Boolean(id && id !== 'new' && /^[0-9a-fA-F]{24}$/.test(id));
          const res = await createMemoryMutation({
            title: promptTitle || 'Daily reflection',
            body: '',
            type: 'conversation',
            status: 'save',
            ...(isStaticPromptId
              ? {
                  prompt_type: 'static',
                  prompt_id: id,
                  reflection_day_key: dayjs().format('YYYY-MM-DD'),
                }
              : {
                  prompt_type: 'ai-generated',
                  prompt_text: promptTitle || '',
                  reflection_day_key: dayjs().format('YYYY-MM-DD'),
                }),
          } as any);
          const created = (res as any)?.data ?? res;
          const newId = created?._id || created?.id;
          if (newId) {
            targetChatId = newId;
            queryClient.invalidateQueries({ queryKey: [queryKeys.conversations()[0]] });
            queryClient.invalidateQueries({ queryKey: [queryKeys.dailyPrompts('')[0]] });
          }
        } catch {
          // fallback
        }
      }

      await streamSend(text, {
        replyTo,
        chatMode,
        deepDiveDimension,
        attachments,
        attachmentPreviews,
        memoryId: targetChatId ?? undefined,
      });
    },
    [
      activeChatId,
      isPromptType,
      id,
      promptTitle,
      startConversationMutation,
      createMemoryMutation,
      queryClient,
      streamSend,
      chatMode,
      deepDiveDimension,
    ],
  );

  // Refetch enrichment stats and prompt memory cache after each AI response
  const prevMessagesLengthRef = useRef(messages.length);
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (
      messages.length > prevMessagesLengthRef.current &&
      lastMessage?.role === 'ai'
    ) {
      queryClient.invalidateQueries({ queryKey: queryKeys.userStats });
      if (activeChatId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.promptMessages(activeChatId) });
      }
      if (isPromptType && id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.overviewPrompts });
        queryClient.invalidateQueries({ queryKey: queryKeys.dailyPrompts() });
        queryClient.invalidateQueries({ queryKey: queryKeys.categoryDetailsPrompts() });
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [activeChatId, id, isPromptType, messages, queryClient]);

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

  const isHostChatTab = !id && !isPromptType;
  const isLoading =
    (!serverMessagePages && isLoadingMessages) ||
    (isPromptType && !promptMemoryRes && isLoadingPromptMemory) ||
    (isHostChatTab && !profile && isLoadingProfile);

  return useMemo(
    () => ({
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
      fetchOlderMessages,
      hasOlderMessages,
      isFetchingOlderMessages,
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
    }),
    [
      id,
      activeChatId,
      isPromptType,
      promptMemory,
      promptTitle,
      router,
      serverMessages,
      isLoading,
      allMessages,
      fetchOlderMessages,
      hasOlderMessages,
      isFetchingOlderMessages,
      streaming,
      streamingText,
      send,
      stop,
      handleBack,
      handleActions,
      chatMode,
      deepDiveDimension,
      handleEnterDeepDive,
      handleExitDeepDive,
      enrichmentStats,
    ],
  );
}
