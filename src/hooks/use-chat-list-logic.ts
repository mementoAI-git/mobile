import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useConversations } from '@/hooks/queries/use-memories';
import { useStartConversation } from '@/hooks/mutations/use-memory-mutations';
import type { IMemory } from '@/types';

export function useChatListLogic() {
  const router = useRouter();
  const { 
    data, 
    isLoading, 
    isFetchingNextPage, 
    fetchNextPage, 
    hasNextPage, 
    refetch, 
    isRefetching 
  } = useConversations();
  
  const { mutate: startConversation, isPending: starting } = useStartConversation();

  const conversations = data?.pages.flatMap((p) => p.docs) ?? [];

  const handleNew = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startConversation({ text: 'Hello' }, {
      onSuccess: (res) => {
        const memory = res.data as any;
        const memoryId = memory?._id || memory?.memory_id || memory?.id;
        router.push({ pathname: '/chat/[id]', params: { id: memoryId } });
      },
    });
  };

  const handleOpenChat = (id: string) => {
    Haptics.selectionAsync();
    router.push({ pathname: '/chat/[id]', params: { id } });
  };

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
