import React, { useState, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { useUiStore } from '@/store';
import { useStories, useMemoriesStats } from '@/hooks/queries/use-memories';

export function useStoriesLogic() {
  const openSheet = useUiStore((s) => s.openSheet);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (value === '') {
      setDebouncedSearch('');
    }
  };

  const handleSearchSubmit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDebouncedSearch(search);
  };

  const { data: statsData } = useMemoriesStats();
  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
    isRefetching,
  } = useStories({
    filter: activeFilter === 'All' ? undefined : activeFilter.toLowerCase(),
    search: debouncedSearch || undefined,
  });

  const stories = data?.pages.flatMap((p) => p.docs) ?? [];
  const stats = statsData?.data;

  const handleCreateNew = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    openSheet('create-memory');
  };

  const handleClearSearch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSearch('');
    setDebouncedSearch('');
  };

  const handleToggleView = (mode: 'grid' | 'list') => {
    Haptics.selectionAsync();
    setViewMode(mode);
  };

  return {
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
    isRefetching,
    refetch,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    handleCreateNew,
    handleClearSearch,
  };
}
