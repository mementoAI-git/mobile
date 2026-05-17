import React from 'react';
import { View, FlatList, RefreshControl, ScrollView, ImageBackground, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Search, LayoutGrid, List } from 'lucide-react-native';
import { MemoryCard } from '@/components/memory/MemoryCard';
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <DashboardHeader title="My Stories" />

      <View className="flex-1">
        <ImageBackground source={PATTERN} className="absolute inset-0 opacity-[0.03]" resizeMode="repeat" />

        {isLoading && !stories.length ? (
          <StoriesSkeleton />
        ) : (
          <FlatList
            data={stories}
            keyExtractor={(item) => item._id}
            ListHeaderComponent={
              <Animated.View entering={FadeInDown.duration(600)} className="pt-4 pb-4 gap-6">
                <Animated.Text className="text-base text-text-weak leading-relaxed" style={{ fontFamily: FONTS.sans }}>
                  A secure archive for your most cherished moments and personal reflections.
                </Animated.Text>

                {/* Stat cards row */}
                {stats && (
                  <View className="gap-4">
                    <View className="flex-row gap-4">
                      <StatCard label="Memories" value={stats.stories_count ?? 0} variant="blue" bg={MEMORIES_BG} onPress={() => { }} />
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
                      rightElement={search ? (
                        <TouchableOpacity onPress={handleClearSearch}>
                          <View className="size-5 bg-text-muted/10 rounded-full items-center justify-center">
                            <Plus size={12} color={COLORS.textWeak} style={{ transform: [{ rotate: '45deg' }] }} />
                          </View>
                        </TouchableOpacity>
                      ) : null}
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
                  <View className="flex-row items-center justify-between">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2.5">
                      {FILTERS.map((f) => (
                        <TouchableOpacity
                          key={f}
                          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveFilter(f); }}
                          activeOpacity={0.7}
                          className={`px-6 py-2.5 rounded-full border ${activeFilter === f ? 'bg-brand border-brand' : 'bg-white border-stroke-weaker'}`}
                        >
                          <Animated.Text className={`text-xs font-bold ${activeFilter === f ? 'text-white' : 'text-text-base'}`} style={{ fontFamily: FONTS.sansBold }}>
                            {f}
                          </Animated.Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>

                {/* Quick Actions Bar */}
                <View className="flex-row items-center gap-4">
                  <TouchableOpacity
                    onPress={handleCreateNew}
                    activeOpacity={0.8}
                    className="flex-1 flex-row items-center justify-center gap-2.5 h-14 rounded-2xl bg-brand shadow-lg shadow-brand/20"
                  >
                    <Plus size={20} color="white" strokeWidth={2.5} />
                    <Animated.Text className="text-base font-bold text-white" style={{ fontFamily: FONTS.sansBold }}>New Memory</Animated.Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            }
            key={viewMode}
            numColumns={viewMode === 'grid' ? 2 : 1}
            columnWrapperStyle={viewMode === 'grid' ? { gap: 16 } : undefined}
            renderItem={({ item }) => (
              <MemoryCard
                memory={item}
                isGrid={viewMode === 'grid'}
                onPress={() =>
                  router.push({ pathname: '/(tabs)/stories/[id]', params: { id: item._id } })
                }
              />
            )}
            contentContainerClassName="px-5 gap-4 pb-24"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.brand} />
            }
            onEndReached={() => hasNextPage && fetchNextPage()}
            onEndReachedThreshold={0.3}
            ListFooterComponent={isFetchingNextPage ? <View className="py-6"><Spinner size="small" /></View> : null}
            ListEmptyComponent={
              <EmptyState
                title={debouncedSearch ? "No matches found" : "Your story begins here"}
                description={debouncedSearch
                  ? `Try a different term for "${debouncedSearch}"`
                  : "Start preserving your life's journey today."
                }
                actionLabel={debouncedSearch ? "Clear search" : "Create first memory"}
                onAction={debouncedSearch ? handleClearSearch : handleCreateNew}
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
