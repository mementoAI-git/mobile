import React, { useCallback, useMemo } from 'react';
import { View, FlatList, RefreshControl, ScrollView, ImageBackground, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Search, LayoutGrid, List } from 'lucide-react-native';
import { MasonryMemoryCard } from '@/components/memory/MasonryMemoryCard';
import { MasonryMemoryGrid } from '@/components/memory/MasonryMemoryGrid';
import { StatCard, DashboardHeader, TextInput, StoriesSkeleton, EmptyState, Spinner } from '@/components/ui';
import { COLORS, FONTS } from '@/constants/tokens';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useStoriesLogic } from '@/hooks/use-stories-logic';
import { useRouter } from 'expo-router';

const PATTERN = require('../../../assets/images/backgrounds/welcome_bg.png');
const MEMORIES_BG = require('../../../assets/images/backgrounds/memories_card_bg.png');
const STREAK_BG = require('../../../assets/images/backgrounds/streak_card_bg.png');

const FILTERS = ['All', 'Bookmarked', 'Deleted'];

export default function StoriesScreen() {
  const router = useRouter();
  const {
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
  } = useStoriesLogic();

  const handleMemoryPress = useCallback(
    (id: string) => router.push({ pathname: '/(tabs)/stories/[id]', params: { id } }),
    [router],
  );

  // Stable renderItem for FlatList — uses same MasonryMemoryCard as grid for visual consistency
  const renderListItem = useCallback(
    ({ item }: { item: any }) => (
      <MasonryMemoryCard
        memory={item}
        variant="list"
        onPress={() => handleMemoryPress(item._id)}
      />
    ),
    [handleMemoryPress],
  );

  // Shared header — used by both list and masonry grid
  const listHeader = useMemo(
    () => (
      <Animated.View entering={FadeInDown.duration(600)} className="pt-4 pb-4 gap-6 px-5">
        <Animated.Text className="text-base text-text-weak leading-relaxed" style={{ fontFamily: FONTS.sans }}>
          A secure archive for your most cherished moments and personal reflections.
        </Animated.Text>

        {/* Stat cards row */}
        {stats && (
          <View className="gap-4">
            <View className="flex-row gap-4">
              <StatCard label="Memories" value={stats.stories_count ?? 0} variant="blue" bg={MEMORIES_BG} onPress={() => {}} />
              <StatCard label="Bookmarks" value={stats.bookmark_count ?? 0} variant="orange" bg={STREAK_BG} onPress={() => setActiveFilter('Bookmarked')} />
            </View>
          </View>
        )}

        {/* Search & Layout Control */}
        <View className="gap-4">
          <View className="flex-row items-center gap-3">
            <TextInput
              placeholder="Search memories..."
              value={search}
              onChangeText={handleSearchChange}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
              containerClassName="flex-1"
              leftElement={<Search size={18} color={COLORS.textWeak} />}
              rightElement={
                search ? (
                  <TouchableOpacity onPress={handleClearSearch}>
                    <View className="size-5 bg-text-muted/10 rounded-full items-center justify-center">
                      <Plus size={12} color={COLORS.textWeak} style={{ transform: [{ rotate: '45deg' }] }} />
                    </View>
                  </TouchableOpacity>
                ) : null
              }
              placeholderTextColor={COLORS.textMuted}
            />
            <View className="flex-row items-center gap-1 border border-stroke-weaker rounded-2xl p-1 bg-white">
              <TouchableOpacity
                onPress={() => handleToggleView('grid')}
                className={`size-10 rounded-xl items-center justify-center ${viewMode === 'grid' ? 'bg-brand' : ''}`}
              >
                <LayoutGrid size={18} color={viewMode === 'grid' ? '#fff' : COLORS.textWeak} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleToggleView('list')}
                className={`size-10 rounded-xl items-center justify-center ${viewMode === 'list' ? 'bg-brand' : ''}`}
              >
                <List size={18} color={viewMode === 'list' ? '#fff' : COLORS.textWeak} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2.5">
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveFilter(f);
                }}
                activeOpacity={0.7}
                className={`px-6 py-2.5 rounded-full border ${activeFilter === f ? 'bg-brand border-brand' : 'bg-white border-stroke-weaker'}`}
              >
                <Animated.Text
                  className={`text-xs font-bold ${activeFilter === f ? 'text-white' : 'text-text-base'}`}
                  style={{ fontFamily: FONTS.sansBold }}
                >
                  {f}
                </Animated.Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Quick Actions Bar */}
        <TouchableOpacity
          onPress={handleCreateNew}
          activeOpacity={0.8}
          className="flex-row items-center justify-center gap-2.5 h-14 rounded-2xl bg-brand"
        >
          <Plus size={20} color="white" strokeWidth={2.5} />
          <Animated.Text className="text-base font-bold text-white" style={{ fontFamily: FONTS.sansBold }}>
            New Memory
          </Animated.Text>
        </TouchableOpacity>
      </Animated.View>
    ),
    // Re-render header only when these change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stats, search, viewMode, activeFilter],
  );

  const emptyState = (
    <EmptyState
      title={debouncedSearch ? 'No matches found' : 'Your story begins here'}
      description={
        debouncedSearch
          ? `Try a different term for "${debouncedSearch}"`
          : "Start preserving your life's journey today."
      }
      actionLabel={debouncedSearch ? 'Clear search' : 'Create first memory'}
      onAction={debouncedSearch ? handleClearSearch : handleCreateNew}
    />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <DashboardHeader title="My Stories" />

      <View className="flex-1">
        <ImageBackground source={PATTERN} className="absolute inset-0 opacity-[0.03]" resizeMode="repeat" />

        {isLoading && !stories.length ? (
          <StoriesSkeleton />
        ) : viewMode === 'grid' ? (
          /* ── Masonry grid view ─────────────────────────────────────── */
          <MasonryMemoryGrid
            memories={stories}
            ListHeaderComponent={listHeader}
            onMemoryPress={(m) => handleMemoryPress(m._id)}
            onEndReached={() => hasNextPage && fetchNextPage()}
            refreshing={isRefetching}
            onRefresh={refetch}
          />
        ) : (
          /* ── List view ─────────────────────────────────────────────── */
          <FlatList
            data={stories}
            keyExtractor={(item) => item._id}
            initialNumToRender={8}
            maxToRenderPerBatch={5}
            windowSize={5}
            removeClippedSubviews
            ListHeaderComponent={listHeader}
            renderItem={renderListItem}
            contentContainerClassName="gap-4 pb-24"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.brand} />
            }
            onEndReached={() => hasNextPage && fetchNextPage()}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              isFetchingNextPage ? (
                <View className="py-6">
                  <Spinner size="small" />
                </View>
              ) : null
            }
            ListEmptyComponent={emptyState}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
