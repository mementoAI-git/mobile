import React, { useCallback, useMemo } from 'react';
import { View, FlatList, RefreshControl, ScrollView, ImageBackground, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Search } from 'lucide-react-native';
// import { LayoutGrid, List } from 'lucide-react-native'; // list mode toggled off for now
import { MasonryMemoryCard } from '@/components/memory/MasonryMemoryCard';
import { MasonryMemoryGrid } from '@/components/memory/MasonryMemoryGrid';
import { StatCard, DashboardHeader, TextInput, StoriesSkeleton, EmptyState, Spinner } from '@/components/ui';
import { COLORS, FONTS } from '@/constants/tokens';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  withTiming,
} from 'react-native-reanimated';
import { useStoriesLogic } from '@/hooks/use-stories-logic';
import { useRouter } from 'expo-router';
import { runtimeDiagnostics } from '@/lib/runtime-diagnostics';

const PATTERN = require('../../../assets/images/backgrounds/welcome_bg.png');
const MEMORIES_BG = require('../../../assets/images/backgrounds/memories_card_bg.png');
const STREAK_BG = require('../../../assets/images/backgrounds/streak_card_bg.png');

const FILTERS = ['All', 'Bookmarked', 'Deleted', 'Pending'];

export default function StoriesScreen() {
  React.useEffect(() => {
    runtimeDiagnostics.record('screen', 'mount', { screen: 'stories' });
    return () => runtimeDiagnostics.record('screen', 'unmount', { screen: 'stories' });
  }, []);
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

  const handleGridMemoryPress = useCallback(
    (memory: { _id: string }) => handleMemoryPress(memory._id),
    [handleMemoryPress],
  );

  const handleGridEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Reanimated scroll tracking
  const scrollY = useSharedValue(0);

  // Floating button animations: transition from a wide pill to a compact circle
  const floatBtnStyle = useAnimatedStyle(() => {
    // Morph width from 136px (wide pill) to 40px (compact circle)
    const width = interpolate(
      scrollY.value,
      [0, 100],
      [136, 40],
      Extrapolation.CLAMP
    );

    return {
      width,
    };
  });

  // Shift the Plus icon horizontally from left-side layout to absolute center
  const animIconStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      scrollY.value,
      [0, 100],
      [-42, 0], // slide icon from left offset (when text is present) back to absolute center (0)
      Extrapolation.CLAMP
    );
    return {
      transform: [{ translateX }],
    };
  });

  // Fade out label and slide it right on scroll
  const labelStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, 40],
      [1, 0],
      Extrapolation.CLAMP
    );
    const translateX = interpolate(
      scrollY.value,
      [0, 100],
      [18, 42], // starts next to offset icon, slides away on scroll
      Extrapolation.CLAMP
    );
    return {
      opacity,
      transform: [{ translateX }],
    };
  });

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
                placeholder="Search memories"
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
              {/* Grid/List toggle — commented out; grid-only for now
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
              */}
            </View>

          {/* Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2.5">
            {FILTERS.map((f) => {
              const countMap: Record<string, number | undefined> = {
                All: stats?.stories_count,
                Bookmarked: stats?.bookmark_count,
                Deleted: stats?.stories_deleted_count,
                Pending: stats?.quick_capture_pending_count,
              };
              const count = countMap[f];
              const label = (count && count > 0) ? `${f} (${count})` : f;
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveFilter(f);
                  }}
                  activeOpacity={0.7}
                  className={`px-6 py-2.5 rounded-full ${activeFilter === f ? 'bg-brand' : 'bg-fill-weaker'}`}
                >
                  <Animated.Text
                    className={`text-xs font-bold ${activeFilter === f ? 'text-white' : 'text-text-base'}`}
                    style={{ fontFamily: FONTS.sansBold }}
                  >
                    {label}
                  </Animated.Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
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
        ) : (
          /* ── Masonry grid view (list mode commented out) ──────────── */
          <MasonryMemoryGrid
            memories={stories}
            ListHeaderComponent={listHeader}
            onMemoryPress={handleGridMemoryPress}
            onEndReached={handleGridEndReached}
            refreshing={isRefetching}
            loadingMore={isFetchingNextPage}
            onRefresh={refetch}
            scrollY={scrollY}
          />
          /* List view — commented out for now
        ) : (
          <Animated.FlatList
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
            onScroll={scrollHandler}
            scrollEventThrottle={16}
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
          */
        )}

        {/* Floating Action Button - morphs width and contents on scroll */}
        <Animated.View 
          style={[
            floatBtnStyle,
            {
              position: 'absolute',
              bottom: 96,
              right: 24,
              height: 40,
              borderRadius: 20,
              backgroundColor: COLORS.brand,
              shadowColor: '#170B00',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: 5,
              zIndex: 50,
              overflow: 'hidden',
            }
          ]}
        >
          <TouchableOpacity
            onPress={handleCreateNew}
            activeOpacity={0.85}
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
            }}
          >
            <Animated.View style={[
              animIconStyle,
              {
                position: 'absolute',
                alignItems: 'center',
                justifyContent: 'center',
              }
            ]}>
              <Plus size={20} color="white" strokeWidth={2.5} />
            </Animated.View>
            <Animated.Text
              style={[
                labelStyle,
                {
                  fontFamily: FONTS.sansBold,
                  fontSize: 13,
                  color: 'white',
                  position: 'absolute',
                }
              ]}
              numberOfLines={1}
            >
              New Memory
            </Animated.Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
