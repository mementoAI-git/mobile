import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState, useMemo } from 'react';
import { useCategoryDetailsPrompts, usePromptCategories } from '@/hooks/queries/use-prompts';
import { useStartConversation } from '@/hooks/mutations/use-memory-mutations';
import { getCategoryMeta } from '@/constants/categories';
import { resolveExploreCategorySlug } from '@/features/explore/category-identity';
import { resolveExploreCatalog } from '@/features/explore/explore-catalog';
import type { IPrompt } from '@/types';

export function useCategoryPromptsLogic() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'all' | 'answered'>('all');
  const canonicalSlug = resolveExploreCategorySlug(id);
  const categoryQuery = usePromptCategories();
  const catalog = useMemo(() => resolveExploreCatalog(categoryQuery.data), [categoryQuery.data]);
  const category = catalog.categories.find(item => item.slug === canonicalSlug);
  const topicsAvailable = !catalog.usingBundledCatalog && !!category;
  const answeredParam = activeTab === 'answered' ? true : undefined;
  const topics = useCategoryDetailsPrompts(canonicalSlug || '', answeredParam, topicsAvailable);
  const { isPending } = useStartConversation();
  const prompts = useMemo(() => topicsAvailable ? topics.data?.pages.flatMap(page => page.docs) ?? [] : [], [topics.data, topicsAvailable]);
  const totalDocs = topics.data?.pages[0]?.totalDocs ?? 0;
  const categoryMeta = useMemo(() => {
    const meta = getCategoryMeta(canonicalSlug);
    return {
      title: category?.title || meta?.title || 'Topics',
      subtitle: category?.description || meta?.subtitle || '',
      image: meta?.image ?? null,
    };
  }, [canonicalSlug, category]);
  const handleTabChange = useCallback((key: string) => {
    if (key === 'all' || key === 'answered') setActiveTab(key);
  }, []);
  const refetch = useCallback(() => {
    void categoryQuery.refetch();
    if (topicsAvailable) void topics.refetch();
  }, [categoryQuery.refetch, topics.refetch, topicsAvailable]);
  const handleLoadMore = useCallback(() => {
    if (topicsAvailable && topics.hasNextPage && !topics.isFetchingNextPage) void topics.fetchNextPage();
  }, [topicsAvailable, topics.hasNextPage, topics.isFetchingNextPage, topics.fetchNextPage]);

  const handleRetryTopics = useCallback(() => {
    if (topics.isFetchNextPageError) handleLoadMore();
    else refetch();
  }, [topics.isFetchNextPageError, handleLoadMore, refetch]);

  const handlePromptPress = useCallback((prompt: IPrompt) => {
    router.push({
      pathname: '/chat/[id]',
      // promptTitle is passed so the chat screen can display the question card
      // immediately — before the async useMemoryByPrompt query resolves.
      // Use the same category title that appears in Topics.
      params: { id: prompt._id || '', type: 'prompt', promptTitle: prompt.title || '', promptLabel: categoryMeta.title },
    });
  }, [categoryMeta.title, router]);

  const handleBack = useCallback(() => {
    // Explore category can be opened via deep link as root screen
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/explore');
    }
  }, [router]);

  const refetchIfStale = useCallback(() => {
    if (categoryQuery.isStale) void categoryQuery.refetch();
    if (topicsAvailable && topics.isStale) void topics.refetch();
  }, [categoryQuery.isStale, categoryQuery.refetch, topicsAvailable, topics.isStale, topics.refetch]);

  return {
    id: canonicalSlug,
    prompts,
    totalDocs,
    categoryMeta,
    activeTab,
    handleTabChange,
    isLoading: categoryQuery.isLoading || topics.isLoading,
    isRefetching: categoryQuery.isRefetching || topics.isRefetching,
    isError: topics.isError,
    usingBundledCatalog: !topicsAvailable,
    isPending,
    refetch,
    refetchIfStale,
    handleLoadMore,
    handleRetryTopics,
    isFetchingNextPage: topics.isFetchingNextPage,
    handlePromptPress,
    handleBack,
  };
}
