import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useUiStore } from '@/store';
import { useStories, useMemoriesStats } from '@/hooks/queries/use-memories';

export function useStoriesLogic() {
  const router = useRouter();
  const openSheet = useUiStore((s) => s.openSheet);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (value === '') {
      setDebouncedSearch('');
    }
  }, []);

  const handleSearchSubmit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDebouncedSearch(search.trim());
  }, [search]);

  const { data: statsData } = useMemoriesStats();
  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
    isRefetching,
  } = useStories({
    filter: activeFilter === 'All' ? undefined : activeFilter.toLowerCase(),
    search: debouncedSearch || undefined,
  });

  const stories = useMemo(() => data?.pages.flatMap((p) => p.docs) ?? [], [data?.pages]);
  const stats = statsData;

  const handleCreateNew = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // lockMode: 'true' prevents the user from switching to quick-capture mode
    router.push({ pathname: '/editor', params: { mode: 'story', lockMode: 'true' } });
  }, [router]);

  const handleClearSearch = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSearch('');
    setDebouncedSearch('');
  }, []);

  const handleToggleView = useCallback((mode: 'grid' | 'list') => {
    Haptics.selectionAsync();
    setViewMode(mode);
  }, []);

  return useMemo(
    () => ({
      openSheet,
      search,
      handleSearchChange,
      handleSearchSubmit,
      debouncedSearch,
      activeFilter,
      setActiveFilter,
      viewMode,
      handleToggleView,
      stories,
      stats,
      isLoading,
      isFetching,
      isRefetching,
      refetch,
      isFetchingNextPage,
      fetchNextPage,
      hasNextPage,
      handleCreateNew,
      handleClearSearch,
    }),
    [
      openSheet,
      search,
      handleSearchChange,
      handleSearchSubmit,
      debouncedSearch,
      activeFilter,
      setActiveFilter,
      viewMode,
      handleToggleView,
      stories,
      stats,
      isLoading,
      isFetching,
      isRefetching,
      refetch,
      isFetchingNextPage,
      fetchNextPage,
      hasNextPage,
      handleCreateNew,
      handleClearSearch,
    ],
  );
}
