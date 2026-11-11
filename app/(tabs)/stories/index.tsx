import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { useCallback, useMemo } from 'react';
import { useVoiceContent } from '@/features/voice-control/hooks';
import { View, RefreshControl, ScrollView, Text } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { SafeAreaView } from 'react-native-safe-area-context';
import Plus from 'lucide-react-native/icons/plus';
import BookOpen from 'lucide-react-native/icons/book-open';
import Bookmark from 'lucide-react-native/icons/bookmark';
import Trash2 from 'lucide-react-native/icons/trash';
import Search from 'lucide-react-native/icons/search';
import LayoutGrid from 'lucide-react-native/icons/layout-grid';
import List from 'lucide-react-native/icons/list';
import { CaptureFab } from '@/components/memory/CaptureFab';
import { StoryListRow } from '@/components/memory/StoryListRow';
import { MasonryMemoryGrid } from '@/components/memory/MasonryMemoryGrid';
import { Button, DashboardHeader, TextInput, StoriesSkeleton, EmptyState, Spinner } from '@/components/ui';
import { useGuardianLensStore } from '@/store/guardian-lens.store';
import { TYPE } from '@/constants/typography';
import { minTouchTarget } from '@/constants/responsive';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { useStoriesLogic } from '@/hooks/use-stories-logic';
import { useRouter } from 'expo-router';
import type { IMemory } from '@/types';
import { runtimeDiagnostics } from '@/lib/runtime-diagnostics';


const FILTERS = ['All', 'Bookmarked', 'Deleted'];

/** The view toggle is a square matching the compact search field's height. */
const SEARCH_CONTROL_HEIGHT = minTouchTarget(48);
const SEARCH_CONTROL_SQUARE = {
  width: SEARCH_CONTROL_HEIGHT,
  height: SEARCH_CONTROL_HEIGHT,
  minHeight: SEARCH_CONTROL_HEIGHT,
  paddingHorizontal: 0,
} as const;

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
  // "Which stories do I have?": the titles in the list, newest first.
  useVoiceContent('Stories in the list', () =>
    (stories ?? [])
      .slice(0, 15)
      .map((story, index) => `${index + 1}. ${story?.title || 'Untitled'}`)
      .join('; '),
  );

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

  // Talk opens a voice conversation; Record opens a new story already recording.
  const handleTalk = useCallback(() => router.push('/voice-call'), [router]);
  const handleRecord = useCallback(
    () => router.push({ pathname: '/editor', params: { mode: 'story', lockMode: 'true', autoRecord: 'true' } }),
    [router],
  );

  // Reanimated scroll tracking
  const scrollY = useSharedValue(0);

  // Stable renderItem for FlatList — compact row with thumbnail or identicon
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
      label: filter,
      count: counts[filter] ?? 0,
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
            count={filter.count}
            active={activeFilter === filter.key}
            onSelect={setActiveFilter}
          />
        ))}
      </ScrollView>
    </View>
  ), [filterTabs, activeFilter, setActiveFilter]);

  const showAllStories = useCallback(() => setActiveFilter('All'), [setActiveFilter]);

  // Simple empty state like the rest of the app: icon, title and a CTA, per tab.
  const emptyCopy = debouncedSearch
    ? { icon: Search, title: 'No matches found', actionLabel: 'Clear search', onAction: handleClearSearch }
    : activeFilter === 'Bookmarked'
      ? { icon: Bookmark, title: 'No bookmarks yet', actionLabel: 'Browse your stories', onAction: showAllStories }
      : activeFilter === 'Deleted'
        ? { icon: Trash2, title: 'Nothing deleted', actionLabel: 'Back to your stories', onAction: showAllStories }
        : { icon: BookOpen, title: 'Your story begins here', actionLabel: 'Write your first story', onAction: handleCreateNew };

  const emptyState = (
    <EmptyState
      icon={emptyCopy.icon}
      title={emptyCopy.title}
      actionLabel={emptyCopy.actionLabel}
      onAction={emptyCopy.onAction}
      actionTone="inverse"
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
            size="compact"
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
            size="md"
            style={SEARCH_CONTROL_SQUARE}
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
            onEndReachedThreshold={0.5}
            ListFooterComponent={isFetchingNextPage ? <View className="py-6"><Spinner size="small" /></View> : null}
            ListEmptyComponent={emptyState}
          />
        )}

        <CaptureFab onTalk={handleTalk} onWrite={handleCreateNew} onRecord={handleRecord} />
      </View>
    </SafeAreaView>
  );
}

function storyKey(story: IMemory) { return story._id; }

const StoryFilterButton = React.memo(function StoryFilterButton({ filter, label, count, active, onSelect }: {
  filter: string;
  label: string;
  count: number;
  active: boolean;
  onSelect: (filter: string) => void;
}) {
  const COLORS = useThemeColors();
  const handlePress = useCallback(() => {
    void Haptics.selectionAsync();
    onSelect(filter);
  }, [onSelect, filter]);
  const textColor = active ? COLORS.activeText : COLORS.textBase;
  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label} ${count}`}
      style={{
        minHeight: minTouchTarget(44),
        paddingHorizontal: 18,
        borderRadius: 999,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: active ? COLORS.activeFill : COLORS.fillWeak,
      }}
    >
      <Text style={[TYPE.label, { color: textColor }]}>{label}</Text>
      <Text style={[TYPE.label, { color: textColor, opacity: 0.6 }]}>{count}</Text>
    </TouchableOpacity>
  );
});

const StoryListItem = React.memo(function StoryListItem({ memory, onOpen }: {
  memory: IMemory;
  onOpen: (id: string) => void;
}) {
  return (
    <View className="px-4 pb-3">
      <StoryListRow memory={memory} onOpen={onOpen} />
    </View>
  );
});
