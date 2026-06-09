import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import { useConversations } from '@/hooks/queries/use-memories';
import { useStartConversation } from '@/hooks/mutations/use-memory-mutations';
import { useUserStore } from '@/store';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/constants/query-keys';
import type { IMemory } from '@/types';

export function useChatListLogic() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
    isRefetching,
  } = useConversations();

  const { mutate: startConversation, isPending: starting } = useStartConversation();

  const conversations = useMemo(() => data?.pages.flatMap((p) => p.docs) ?? [], [data?.pages]);

  const handleNew = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Check for existing primary_conversation_id — web routes to it instead of creating new
    const user = useUserStore.getState().user;
    const primaryId = user?.primary_conversation_id;

    if (primaryId) {
      router.push({ pathname: '/chat/[id]', params: { id: primaryId } });
      return;
    }

    // No primary thread yet — create one
    startConversation(undefined, {
      onSuccess: (res) => {
        const memory = res.data as any;
        const memoryId = memory?._id || memory?.memory_id || memory?.id;

        // Invalidate profile so primary_conversation_id is fresh for next time
        queryClient.invalidateQueries({ queryKey: queryKeys.profile });

        router.push({ pathname: '/chat/[id]', params: { id: memoryId } });
      },
    });
  }, [queryClient, router, startConversation]);

  const handleOpenChat = useCallback((id: string) => {
    Haptics.selectionAsync();
    router.push({ pathname: '/chat/[id]', params: { id } });
  }, [router]);

  return {
    router,
    conversations,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
    isRefetching,
    handleNew,
    handleOpenChat,
    starting,
  };
}
