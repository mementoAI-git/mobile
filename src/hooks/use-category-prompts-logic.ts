import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState, useMemo } from 'react';
import { useCategoryDetailsPrompts } from '@/hooks/queries/use-prompts';
import { useStartConversation } from '@/hooks/mutations/use-memory-mutations';
import { CATEGORY_META } from '@/constants/categories';
import type { IPrompt } from '@/types';

export function useCategoryPromptsLogic() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0);

  // tab 0: Uploaded (undefined), tab 1: Answered (true), tab 2: Unanswered (false)
  const answeredParam = activeTab === 0 ? undefined : activeTab === 1;

  const { data, isLoading, refetch, isRefetching, isStale } = useCategoryDetailsPrompts(id || '', answeredParam);
  const { isPending } = useStartConversation();

  const prompts = data?.prompts ?? [];
  const totalDocs = data?.totalDocs ?? 0;

  const categoryMeta = useMemo(() => {
    const slugKey = String(id || '').toLowerCase();
    return CATEGORY_META[slugKey] || {
      title: String(id || '').replace(/-/g, ' ') || 'Category',
      subtitle: 'Explore prompts in this category',
      image: null,
    };
  }, [id]);

  const handlePromptPress = useCallback((prompt: IPrompt) => {
    router.push({
      pathname: '/chat/[id]',
      // promptTitle is passed so the chat screen can display the question card
      // immediately — before the async useMemoryByPrompt query resolves.
      // promptLabel: id is the category slug (e.g. 'career', 'life-transition')
      // chat/[id].tsx title-cases it to show "Career" / "Life Transition" instead of "Today's reflection"
      params: { id: prompt._id || '', type: 'prompt', promptTitle: prompt.title || '', promptLabel: id || '' },
    });
  }, [id, router]);

  const handleBack = useCallback(() => {
    // Explore category can be opened via deep link as root screen
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/explore');
    }
  }, [router]);

  const refetchIfStale = useCallback(() => {
    if (isStale) void refetch();
  }, [isStale, refetch]);

  return {
    id,
    router,
    prompts,
    totalDocs,
    categoryMeta,
    activeTab,
    setActiveTab,
    isLoading,
    isRefetching,
    isPending,
    refetch,
    refetchIfStale,
    handlePromptPress,
    handleBack,
  };
}
