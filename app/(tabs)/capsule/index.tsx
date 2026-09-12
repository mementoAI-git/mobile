import React, { useCallback, useState, useMemo } from 'react';
import { FlatList, RefreshControl, View, ScrollView, ImageBackground, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Search, Grid, List, X } from 'lucide-react-native';
import { CapsuleCard } from '@/components/capsule/CapsuleCard';
import { StatCard, DashboardHeader, CapsuleSkeleton, EmptyState, Spinner, Button, TextInput, TimerFillIcon, ZapIcon, UnpdfIcon, PauseIcon } from '@/components/ui';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useCapsulesLogic } from '@/hooks/use-capsules-logic';
import { useUiStore } from '@/store';

const PATTERN = require('../../../assets/images/backgrounds/welcome_bg.png');
const MEMORIES_BG = require('../../../assets/images/backgrounds/memories_card_bg.png');
const BENEFI_BG = require('../../../assets/images/backgrounds/benefi_card_bg.png');
const CAPSULE_BG = require('../../../assets/images/backgrounds/time_cap_card_bg.png');
const STREAK_BG = require('../../../assets/images/backgrounds/streak_card_bg.png');
const EMPTY_CAPSULES_IMG = require('../../../assets/images/illustrations/empty_capsules.png');

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'draft', label: 'Drafts' },
  { id: 'pause', label: 'Frozen' }
];

export default function CapsuleScreen() {
  const {
    filter,
    setFilter,
    stats,
    capsules,
    isLoading,
    isRefetching,
    refetch,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    handleCreateNew,
    handleClearFilter,
  } = useCapsulesLogic();

  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Normalize stats from API to support snake_case, camelCase, and direct mappings
  const scheduled = stats ? (stats.scheduled ?? stats.scheduled_count ?? 0) : 0;
  const delivered = stats ? (stats.delivered ?? stats.delivered_count ?? 0) : 0;
  const draft = stats ? (stats.draft ?? stats.draft_count ?? 0) : 0;
  const frozen = stats ? (stats.frozen ?? stats.paused_count ?? stats.pause_count ?? 0) : 0;

  // Search filter
  const filteredCapsules = useMemo(() => {
    if (!searchQuery) return capsules;
    const q = searchQuery.toLowerCase();
    return capsules.filter(c =>
      c.title?.toLowerCase().includes(q) ||
      c.body?.toLowerCase().includes(q) ||
      c.recipients?.some((r: any) =>
        (r.first_name || r.name || '').toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q)
      )
    );
  }, [capsules, searchQuery]);

  const handleOpenCapsuleDetail = useCallback((item: (typeof filteredCapsules)[number]) => {
    useUiStore.getState().openSheet('capsule-detail', { capsule: item });
  }, []);

  const renderCapsuleItem = useCallback(
    ({ item }: { item: (typeof filteredCapsules)[number] }) => (
      <CapsuleCard
        capsule={item}
        layoutMode={layoutMode}
        onPress={() => handleOpenCapsuleDetail(item)}
      />
    ),
    [layoutMode, handleOpenCapsuleDetail],
  );


  const getFilterCount = useCallback((id: string) => {
    if (!stats) return null;
    if (id === '') return (stats.total ?? stats.total_count ?? (scheduled + delivered + draft + frozen));
    if (id === 'scheduled') return scheduled;
    if (id === 'delivered') return delivered;
    if (id === 'draft') return draft;
    if (id === 'pause') return frozen;
    return null;
  }, [stats, scheduled, delivered, draft, frozen]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleToggleSearch = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSearch(prev => !prev);
  }, []);

  const handleToggleLayout = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLayoutMode(prev => prev === 'grid' ? 'list' : 'grid');
  }, []);

  const handleClearSearch = useCallback(() => setSearchQuery(''), []);

  // Stable per-filter setters — avoid inline arrows in filter pills
  const handleSetFilterAll       = useCallback(() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFilter('');          }, [setFilter]);
  const handleSetFilterScheduled = useCallback(() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFilter('scheduled'); }, [setFilter]);
  const handleSetFilterDelivered = useCallback(() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFilter('delivered'); }, [setFilter]);
  const handleSetFilterDraft     = useCallback(() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFilter('draft');     }, [setFilter]);
  const handleSetFilterPause     = useCallback(() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFilter('pause');     }, [setFilter]);

  const filterHandlers: Record<string, () => void> = {
    '':          handleSetFilterAll,
    scheduled:   handleSetFilterScheduled,
    delivered:   handleSetFilterDelivered,
    draft:       handleSetFilterDraft,
    pause:       handleSetFilterPause,
  };


  const footerComponent = useMemo(
    () => isFetchingNextPage ? <View className="py-6"><Spinner size="small" /></View> : null,
    [isFetchingNextPage],
  );

  const listHeaderComponent = useMemo(
    () => (
      <Animated.View entering={FadeInDown.duration(600)} className="pt-4 pb-4 gap-6">
        <Animated.Text className="text-text-weak" style={TYPE.body}>
          Preserve your thoughts and media in time capsules that deliver to your loved ones exactly when you choose.
        </Animated.Text>

        {/* Stats Grid */}
        <View className="gap-4">
          <View className="flex-row gap-4">
            <StatCard
              label="Scheduled"
              value={scheduled}
              unit="messages"
              variant="blue"
              bg={CAPSULE_BG}
              icon={<TimerFillIcon size={44} />}
              onPress={handleSetFilterScheduled}
            />
            <StatCard
              label="Delivered/Unlocked"
              value={delivered}
              unit="messages"
              variant="pink"
              bg={STREAK_BG}
              icon={<ZapIcon size={44} />}
              onPress={handleSetFilterDelivered}
            />
          </View>
          <View className="flex-row gap-4">
            <StatCard
              label="Drafts"
              value={draft}
              unit="messages"
              variant="orange"
              bg={BENEFI_BG}
              icon={<UnpdfIcon size={44} />}
              onPress={handleSetFilterDraft}
            />
            <StatCard
              label="Frozen"
              value={frozen}
              unit="messages"
              variant="green"
              bg={MEMORIES_BG}
              icon={<PauseIcon size={44} />}
              onPress={handleSetFilterPause}
            />
          </View>
        </View>

        {/* Filter Pills, Search & Layout Actions */}
        <View className="mt-2 flex-row items-center gap-2">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2 px-1"
            className="flex-1"
          >
            {FILTERS.map((f) => {
              const count = getFilterCount(f.id);
              const label = count !== null ? `${f.label} (${count})` : f.label;
              const isActive = filter === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  onPress={filterHandlers[f.id]}
                  activeOpacity={0.7}
                  className={`px-5 py-2.5 rounded-full ${isActive ? 'bg-brand' : 'bg-fill-weaker'}`}
                >
                  <Animated.Text className={isActive ? 'text-white' : 'text-text-base'} style={TYPE.metadata}>
                    {label}
                  </Animated.Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Search Button Pill */}
          <TouchableOpacity
            onPress={handleToggleSearch}
            activeOpacity={0.7}
            className={`size-10 rounded-full items-center justify-center shrink-0 ${showSearch ? 'bg-brand' : 'bg-fill-weaker'}`}
          >
            <Search size={16} color={showSearch ? 'white' : COLORS.textStrong} />
          </TouchableOpacity>

          {/* Grid/List Toggle Pill */}
          <TouchableOpacity
            onPress={handleToggleLayout}
            activeOpacity={0.7}
            className="size-10 rounded-full bg-fill-weaker items-center justify-center shrink-0"
          >
            {layoutMode === 'grid' ? (
              <Grid size={16} color={COLORS.textStrong} />
            ) : (
              <List size={16} color={COLORS.textStrong} />
            )}
          </TouchableOpacity>
        </View>

        {/* Collapsible Search Input Box */}
        {showSearch && (
          <Animated.View entering={FadeInDown.duration(200)}>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search title, body, or recipient"
              leftElement={<Search size={18} color={COLORS.textWeak} />}
              rightElement={
                searchQuery.length > 0 ? (
                  <TouchableOpacity onPress={handleClearSearch} hitSlop={10}>
                    <X size={16} color={COLORS.textWeak} />
                  </TouchableOpacity>
                ) : undefined
              }
              autoFocus
            />
          </Animated.View>
        )}

        {/* Action Button */}
        <Button
          onPress={handleCreateNew}
          size="lg"
          leftIcon={<Plus size={20} color={COLORS.textInverse} strokeWidth={2.5} />}
        >
          Create New Capsule
        </Button>
      </Animated.View>
    ),
    [
      scheduled,
      delivered,
      draft,
      frozen,
      handleSetFilterScheduled,
      handleSetFilterDelivered,
      handleSetFilterDraft,
      handleSetFilterPause,
      getFilterCount,
      filter,
      filterHandlers,
      handleToggleSearch,
      showSearch,
      handleToggleLayout,
      layoutMode,
      searchQuery,
      handleClearSearch,
      handleCreateNew,
    ],
  );


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <DashboardHeader title="Time Capsule" />

      <View className="flex-1">
        <ImageBackground source={PATTERN} className="absolute inset-0 opacity-[0.03]" resizeMode="repeat" />

        {isLoading && !capsules.length ? (
          <CapsuleSkeleton />
        ) : (
          <FlatList
            data={filteredCapsules}
            keyExtractor={(item) => item._id ?? ''}
            initialNumToRender={6}
            maxToRenderPerBatch={4}
            windowSize={5}
            removeClippedSubviews
            ListHeaderComponent={listHeaderComponent}
            contentContainerClassName="px-6 pb-24 flex-grow"
            showsVerticalScrollIndicator={false}
            renderItem={renderCapsuleItem}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.brand} />
            }
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.3}
            ListFooterComponent={footerComponent}
            ListEmptyComponent={
              <EmptyState
                image={EMPTY_CAPSULES_IMG}
                title={filter ? "No capsules found" : "Your future self awaits"}
                description={filter
                  ? `No capsules match this filter.`
                  : "Start by creating a time capsule for your loved ones."
                }
                actionLabel={filter ? "Clear filter" : "Create first capsule"}
                onAction={filter ? handleClearFilter : handleCreateNew}
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
