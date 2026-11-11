import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { useCallback, useMemo } from 'react';
import { View, FlatList, RefreshControl, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CategoryCard } from '@/components/explore/CategoryCard';
import { DailyPromptSection } from '@/components/overview/DailyPromptSection';
import { DashboardHeader, ExploreSkeleton, EmptyState, Spinner } from '@/components/ui';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { getCategoryMeta } from '@/constants/categories';
import type { ExploreCategory } from '@/features/explore/explore-catalog';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useExploreLogic } from '@/hooks/use-explore-logic';
import { useFocusEffect } from 'expo-router';
import { useVoiceScroll } from '@/features/voice-control/hooks';

const EMPTY_EXPLORE_IMG = require('../../../assets/images/illustrations/empty_explore.webp');

const ExploreCategoryItem = React.memo(function ExploreCategoryItem({
  category,
  onPress,
}: {
  category: ExploreCategory;
  onPress: (slug: string) => void;
}) {
  const handlePress = useCallback(() => onPress(category.slug), [category.slug, onPress]);
  return (
    <CategoryCard
      title={category.title}
      subtitle={category.description}
      image={getCategoryMeta(category.slug)?.image}
      questionCount={category.starterTotal}
      onPress={handlePress}
    />
  );
});

export default function ExploreScreen() {
  const COLORS = useThemeColors();
  const {
    categories,
    usingBundledCatalog,
    isLoading,
    isStartingConversation,
    refetch,
    refetchIfStale,
    isRefetching,
    handleOpenCategory,
    handleBackToOverview,
  } = useExploreLogic();

  useFocusEffect(
    React.useCallback(() => {
      refetchIfStale();
    }, [refetchIfStale])
  );

  // Lets voice scroll this screen ("scroll down", "go to the top").
  const voiceScrollRef = useVoiceScroll<FlatList<any>>();
  const listHeader = useMemo(
    () => (
      <Animated.View entering={FadeInDown.duration(600)} className="pt-4 pb-6">
        <View className="mb-10"><DailyPromptSection compact /></View>

        <Animated.Text className="text-text-strong mb-4" style={TYPE.sectionTitle}>
          Categories
        </Animated.Text>
        {usingBundledCatalog && !isLoading && (
          <Text accessibilityRole="text" className="text-text-weak" style={TYPE.body}>
            Questions are temporarily unavailable while Topics is being updated. Pull down to try again.
          </Text>
        )}
      </Animated.View>
    ),
    [usingBundledCatalog, isLoading],
  );

  const renderCategoryItem = useCallback(
    ({ item }: { item: ExploreCategory }) => (
      <ExploreCategoryItem category={item} onPress={handleOpenCategory} />
    ),
    [handleOpenCategory],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <DashboardHeader title="Topics" />

      <View className="flex-1 relative">


        {isStartingConversation && (
          <View className="absolute inset-0 bg-black/10 items-center justify-center z-50">
            <View className="bg-popover p-6 rounded-2xl shadow-lg border border-stroke-weaker items-center gap-3">
              <Spinner size="large" color={COLORS.brand} />
              <Animated.Text className="text-text-strong" style={TYPE.label}>Starting reflect session...</Animated.Text>
            </View>
          </View>
        )}

        {isLoading && !categories.length ? (
          <ExploreSkeleton />
        ) : (
          <Animated.FlatList
            ref={voiceScrollRef}
            data={categories}
            keyExtractor={(item) => item.slug}
            initialNumToRender={8}
            maxToRenderPerBatch={5}
            windowSize={5}
            removeClippedSubviews
            ListHeaderComponent={listHeader}
            contentContainerClassName="px-4 pb-24 flex-grow"
            showsVerticalScrollIndicator={false}
            renderItem={renderCategoryItem}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.brand} />
            }
            ListEmptyComponent={
              <EmptyState
                image={EMPTY_EXPLORE_IMG}
                title="Nothing here yet"
                description="We're preparing new topics for you to explore."
                actionLabel="Back to Overview"
                onAction={handleBackToOverview}
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
