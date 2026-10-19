import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { useCallback, useMemo } from 'react';
import { View, RefreshControl, ScrollView } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { SafeAreaView } from 'react-native-safe-area-context';
import Plus from 'lucide-react-native/icons/plus';
import Search from 'lucide-react-native/icons/search';
import LayoutGrid from 'lucide-react-native/icons/layout-grid';
import List from 'lucide-react-native/icons/list';
import { MasonryMemoryCard } from '@/components/memory/MasonryMemoryCard';
import { MasonryMemoryGrid } from '@/components/memory/MasonryMemoryGrid';
import { Button, DashboardHeader, TextInput, StoriesSkeleton, EmptyState, Spinner } from '@/components/ui';
import { useGuardianLensStore } from '@/store/guardian-lens.store';
import { BRAND_BUTTON_GRADIENT } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { minTouchTarget, radius, iconSize } from '@/constants/responsive';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { useStoriesLogic } from '@/hooks/use-stories-logic';
import { useRouter } from 'expo-router';
import type { IMemory } from '@/types';
import { runtimeDiagnostics } from '@/lib/runtime-diagnostics';

const EMPTY_MEMORIES_IMG = require('../../../assets/images/illustrations/empty_memories.webp');

const FILTERS = ['All', 'Bookmarked', 'Deleted'];

export default function StoriesScreen() {
  const COLORS = useThemeColors();
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
    isFetching,
    isRefetching,
    refetch,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    handleCreateNew,
    handleClearSearch,
  } = useStoriesLogic();

  const simulatedBeneficiary = useGuardianLensStore((s) => s.simulatedBeneficiary);
  const clearSimulation = useGuardianLensStore((s) => s.clearSimulation);

  const displayedStories = useMemo(() => {
    if (!simulatedBeneficiary) return stories;
    return stories.filter((s) => s.visibility !== 'private');
  }, [simulatedBeneficiary, stories]);

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
    // Morph width from 136px (wide pill) to 44px (compact circle)
    const width = interpolate(
      scrollY.value,
      [0, 100],
      [136, 44],
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
    ({ item }: { item: IMemory }) => (
      <StoryListItem memory={item} onOpen={handleMemoryPress} />
    ),
    [handleMemoryPress],
  );

  const handleSwitchView = useCallback(() => {
    handleToggleView(viewMode === 'grid' ? 'list' : 'grid');
    scrollY.value = 0;
  }, [handleToggleView, viewMode, scrollY]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => { scrollY.value = event.contentOffset.y; },
  });

  const filterTabs = useMemo(() => {
    const counts: Record<string, number | undefined> = {
      All: stats?.stories_count,
      Bookmarked: stats?.bookmark_count,
      Deleted: stats?.stories_deleted_count,
    };
    return FILTERS.map((filter) => ({
      key: filter,
      label: counts[filter] ? `${filter} (${counts[filter]})` : filter,
    }));
  }, [stats]);

  const listHeader = useMemo(() => (
    <View className="px-4 pt-2 pb-10">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2.5">
        {filterTabs.map((filter) => (
          <StoryFilterButton
            key={filter.key}
            filter={filter.key}
            label={filter.label}
            active={activeFilter === filter.key}
            onSelect={setActiveFilter}
          />
        ))}
      </ScrollView>
    </View>
  ), [filterTabs, activeFilter, setActiveFilter]);

  const emptyState = (
    <EmptyState
      image={EMPTY_MEMORIES_IMG}
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

      {simulatedBeneficiary && (
        <View className="mx-4 mt-2 mb-3 px-4 py-3 bg-warning/15 border border-warning/30 rounded-2xl flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5 flex-1 mr-2">
            <View className="size-2.5 rounded-full bg-warning mr-1" />
            <View className="flex-1">
              <Animated.Text style={[TYPE.metadata, { color: COLORS.warning }]}>
                GUARDIAN LENS ACTIVE
              </Animated.Text>
              <Animated.Text style={[TYPE.bodySmall, { color: COLORS.textStrong }]} numberOfLines={1}>
                Viewing as {simulatedBeneficiary.name} ({displayedStories.length} shared)
              </Animated.Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => {
              void Haptics.selectionAsync();
              clearSimulation();
            }}
            className="px-3 py-1.5 rounded-full bg-warning/25"
          >
            <Animated.Text style={[TYPE.buttonSmall, { color: COLORS.warning }]}>
              Exit Lens
            </Animated.Text>
          </TouchableOpacity>
        </View>
      )}

      <View className="flex-1">


        <View className="flex-row items-center gap-3 px-4 pt-4 pb-3">
          <TextInput
            accessibilityLabel="Search stories"
            placeholder="Search stories"
            value={search}
            onChangeText={handleSearchChange}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            containerClassName="flex-1"
            textContentType="none"
            autoComplete="off"
            autoCorrect={false}
            spellCheck={false}
            leftElement={<Search size={18} color={COLORS.textWeak} />}
            rightElement={isFetching && Boolean(debouncedSearch) ? <Spinner size="small" /> : search ? (
              <Button variant="ghost" iconOnly size="sm" accessibilityLabel="Clear search" onPress={handleClearSearch}>
                <Plus size={16} color={COLORS.textWeak} style={{ transform: [{ rotate: '45deg' }] }} />
              </Button>
            ) : null}
            placeholderTextColor={COLORS.textMuted}
          />
          <Button
            variant="secondary"
            iconOnly
            size="lg"
            className="w-14"
            accessibilityLabel={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
            onPress={handleSwitchView}
          >
            {viewMode === 'grid' ? <List size={20} color={COLORS.textStrong} /> : <LayoutGrid size={20} color={COLORS.textStrong} />}
          </Button>
        </View>

        {isLoading && !stories.length && !debouncedSearch ? (
          <>
            {listHeader}
            <StoriesSkeleton viewMode={viewMode} />
          </>
        ) : viewMode === 'grid' ? (
          <MasonryMemoryGrid
            memories={displayedStories}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={emptyState}
            onMemoryPress={handleGridMemoryPress}
            onEndReached={handleGridEndReached}
            refreshing={isRefetching}
            loadingMore={isFetchingNextPage}
            onRefresh={refetch}
            scrollY={scrollY}
          />
        ) : (
          <Animated.FlatList
            data={displayedStories}
            keyExtractor={storyKey}
            initialNumToRender={8}
            maxToRenderPerBatch={5}
            windowSize={5}
            removeClippedSubviews
            ListHeaderComponent={listHeader}
            renderItem={renderListItem}
            contentContainerClassName="pb-40"
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.brand} />}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            onEndReached={handleGridEndReached}
            onEndReachedThreshold={0.3}
            ListFooterComponent={isFetchingNextPage ? <View className="py-6"><Spinner size="small" /></View> : null}
            ListEmptyComponent={emptyState}
          />
        )}

        {/* Floating Action Button - morphs width and contents on scroll */}
        <Animated.View
          style={[
            floatBtnStyle,
            {
              position: 'absolute',
              bottom: 96,
              right: 24,
              height: minTouchTarget(44),
              borderRadius: radius(22),
              backgroundColor: COLORS.brand,
              experimental_backgroundImage: BRAND_BUTTON_GRADIENT,
              shadowColor: COLORS.shadow,
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
              <Plus size={iconSize(20)} color="white" strokeWidth={2.5} />
            </Animated.View>
            <Animated.Text
              style={[
                labelStyle,
                TYPE.buttonSmall,
                {
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

function storyKey(story: IMemory) { return story._id; }

const StoryFilterButton = React.memo(function StoryFilterButton({ filter, label, active, onSelect }: {
  filter: string;
  label: string;
  active: boolean;
  onSelect: (filter: string) => void;
}) {
  const handlePress = useCallback(() => onSelect(filter), [onSelect, filter]);
  return (
    <Button
      variant={active ? 'primary' : 'secondary'}
      size="md"
      accessibilityLabel={`${label}${active ? ', selected' : ''}`}
      onPress={handlePress}
    >
      {label}
    </Button>
  );
});

const StoryListItem = React.memo(function StoryListItem({ memory, onOpen }: {
  memory: IMemory;
  onOpen: (id: string) => void;
}) {
  const handlePress = useCallback(() => onOpen(memory._id), [onOpen, memory._id]);
  return (
    <View className="px-4 pb-4">
      <MasonryMemoryCard memory={memory} variant="list" onPress={handlePress} />
    </View>
  );
});
