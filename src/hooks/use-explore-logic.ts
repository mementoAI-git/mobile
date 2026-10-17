import { useRouter } from 'expo-router';
import { usePromptCategories, useDailyPrompts } from '@/hooks/queries/use-prompts';
import { useStartConversation } from '@/hooks/mutations/use-memory-mutations';
import { useCallback, useMemo } from 'react';
import { resolveExploreCatalog } from '@/features/explore/explore-catalog';
import type { IPrompt } from '@/types';

export function useExploreLogic() {
  const router = useRouter();
  const {
    data: categories,
    isLoading: categoriesLoading,
    refetch: refetchCategories,
    isRefetching: isRefetchingCategories,
    isStale: categoriesStale,
  } = usePromptCategories();
  const {
    data: slots,
    isLoading: promptsLoading,
    refetch: refetchDailyPrompts,
    isRefetching: isRefetchingDailyPrompts,
    isStale: dailyPromptsStale,
  } = useDailyPrompts();
  const { mutate: startConversation, isPending: isStartingConversation } = useStartConversation();

  const staticPrompts = useMemo(() => {
    return (slots ?? [])
      .filter((row) => row.slot_kind === 'static')
      .map((row) => row.prompt)
      .filter((p) => Boolean(p?._id));
  }, [slots]);

  const handleOpenCategory = useCallback((id: string) => {
    router.push({
      pathname: '/(tabs)/explore/[id]',
      params: { id },
    });
  }, [router]);

  const handlePromptPress = useCallback((prompt: IPrompt) => {
    router.push({
      pathname: '/chat/[id]',
      params: { id: prompt._id || '', type: 'prompt', promptTitle: prompt.title || '' },
    });
  }, [router]);

  const handleBackToOverview = useCallback(() => {
    router.replace('/(tabs)/overview');
  }, [router]);

  const catalog = useMemo(() => resolveExploreCatalog(categories), [categories]);

  const refetch = useCallback(() => {
    void refetchCategories();
    void refetchDailyPrompts();
  }, [refetchCategories, refetchDailyPrompts]);

  const refetchIfStale = useCallback(() => {
    if (categoriesStale) void refetchCategories();
    if (dailyPromptsStale) void refetchDailyPrompts();
  }, [categoriesStale, dailyPromptsStale, refetchCategories, refetchDailyPrompts]);

  return useMemo(
    () => ({
      router,
      categories: catalog.categories,
      usingBundledCatalog: catalog.usingBundledCatalog,
      staticPrompts,
      isLoading: (categoriesLoading && (!categories || (categories as any[]).length === 0)) || promptsLoading,
      isStartingConversation,
      refetch,
      refetchIfStale,
      isRefetching: isRefetchingCategories || isRefetchingDailyPrompts,
      handleOpenCategory,
      handlePromptPress,
      handleBackToOverview,
    }),
    [
      router,
      catalog,
      staticPrompts,
      categoriesLoading,
      categories,
      promptsLoading,
      isStartingConversation,
      refetch,
      refetchIfStale,
      isRefetchingCategories,
      isRefetchingDailyPrompts,
      handleOpenCategory,
      handlePromptPress,
      handleBackToOverview,
    ],
  );
}
