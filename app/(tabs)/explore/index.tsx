import React, { useCallback, useMemo } from 'react';
import { View, FlatList, RefreshControl, ImageBackground, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CategoryCard } from '@/components/explore/CategoryCard';
import { ContinueReflectingCard } from '@/components/explore/ContinueReflectingCard';
import { DashboardHeader, ExploreSkeleton, EmptyState, Spinner } from '@/components/ui';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { getCategoryMeta } from '@/constants/categories';
import type { ExploreCategory } from '@/features/explore/explore-catalog';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useExploreLogic } from '@/hooks/use-explore-logic';
import { useFocusEffect } from 'expo-router';
import { useVoiceScroll } from '@/features/voice-control/hooks';

const PATTERN = require('../../../assets/images/backgrounds/welcome_bg.png');
const EMPTY_EXPLORE_IMG = require('../../../assets/images/illustrations/empty_explore.webp');

// Stable module-level sub-component — avoid creating React component types inside render
const MemoPromptItem = React.memo(function PromptItem({
  prompt,
  onPress,
}: {
  prompt: any;
  onPress: (p: any) => void;
}) {
  const handlePress = useCallback(() => {
    onPress(prompt);
  }, [prompt, onPress]);
  return <ContinueReflectingCard title={prompt.title || ''} onPress={handlePress} />;
});

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
      onPress={handlePress}
    />
  );
});

export default function ExploreScreen() {
  const {
    categories,
    usingBundledCatalog,
    staticPrompts,
    isLoading,
    isStartingConversation,
    refetch,
    refetchIfStale,
    isRefetching,
    handleOpenCategory,
    handlePromptPress,
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
        <Animated.Text className="text-text-weak mb-6" style={TYPE.body}>
          Discover prompts that help you explore the depths of your story and find new ways to connect.
        </Animated.Text>

        {staticPrompts.length > 0 && (
          <View className="mb-6">
            <Animated.Text className="text-text-strong mb-4" style={TYPE.sectionTitle}>
              Continue{' '}
              <Text style={{ fontStyle: 'italic', color: COLORS.textWeak }}>
                reflecting
              </Text>
            </Animated.Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 24, paddingRight: 8, paddingBottom: 8 }}
              className="-mx-6"
            >
              {staticPrompts.map((prompt) => (
                <MemoPromptItem key={prompt._id} prompt={prompt} onPress={handlePromptPress} />
              ))}
            </ScrollView>
          </View>
        )}

        <Animated.Text className="text-text-strong mb-4" style={TYPE.sectionTitle}>
          Explore categories
        </Animated.Text>
        {usingBundledCatalog && !isLoading && (
          <Text accessibilityRole="text" className="text-text-weak" style={TYPE.body}>
            Questions are temporarily unavailable while Explore is being updated. Pull down to try again.
          </Text>
        )}
      </Animated.View>
    ),
    [staticPrompts, handlePromptPress, usingBundledCatalog, isLoading],
  );

  const renderCategoryItem = useCallback(
    ({ item }: { item: ExploreCategory }) => (
      <ExploreCategoryItem category={item} onPress={handleOpenCategory} />
    ),
    [handleOpenCategory],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <DashboardHeader title="Explore" />

      <View className="flex-1 relative">
        <ImageBackground source={PATTERN} className="absolute inset-0 opacity-[0.03]" resizeMode="repeat" />

        {isStartingConversation && (
          <View className="absolute inset-0 bg-black/10 items-center justify-center z-50">
            <View className="bg-white p-6 rounded-2xl shadow-lg border border-stroke-weaker items-center gap-3">
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
            contentContainerClassName="px-6 pb-24 flex-grow"
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
