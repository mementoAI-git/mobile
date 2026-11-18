import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useUiStore } from '@/store';
import { useStories, useMemoriesStats } from '@/hooks/queries/use-memories';

/** Stories load 25 at a time; scrolling near the end loads the next 25. */
export const STORIES_PAGE_SIZE = 25;

export function useStoriesLogic() {
  const router = useRouter();
  const openSheet = useUiStore((s) => s.openSheet);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  // ?filter=bookmarked opens the Bookmarked tab (voice "show my bookmarks"),
  // also when the tab is already open.
  const { filter: filterParam } = useLocalSearchParams<{ filter?: string }>();
  useEffect(() => {
    if (filterParam === 'bookmarked') setActiveFilter('Bookmarked');
  }, [filterParam]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
  } = useStories({
    limit: STORIES_PAGE_SIZE,
    filter: activeFilter === 'All' ? undefined : activeFilter.toLowerCase(),
    search: debouncedSearch || undefined,
  });

  // The pull-to-refresh spinner follows only a real pull. React Query's isRefetching is
  // also true while a new tab loads behind keepPreviousData, and a refreshing
  // RefreshControl pushes the list down on iOS, so switching tabs made the page jump.
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const pullToRefresh = useCallback(async () => {
    setIsPullRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsPullRefreshing(false);
    }
  }, [refetch]);

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
      isPullRefreshing,
      pullToRefresh,
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
      isPullRefreshing,
      pullToRefresh,
      isFetchingNextPage,
      fetchNextPage,
      hasNextPage,
      handleCreateNew,
      handleClearSearch,
    ],
  );
}
