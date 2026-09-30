import React, { useCallback, useMemo } from 'react';
import { View, FlatList, RefreshControl, ImageBackground, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CategoryCard } from '@/components/explore/CategoryCard';
import { ContinueReflectingCard } from '@/components/explore/ContinueReflectingCard';
import { DashboardHeader, ExploreSkeleton, EmptyState, Spinner } from '@/components/ui';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { CATEGORY_META } from '@/constants/categories';
import { formatCategoryProgress } from '@/features/explore/category-progress';
import { getPromptCategorySlug } from '@/features/explore/category-identity';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useExploreLogic } from '@/hooks/use-explore-logic';
import { useFocusEffect } from 'expo-router';

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

export default function ExploreScreen() {
  const {
    categories,
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

  const getCategoryMeta = useCallback((item: any) => {
    const categorySlug = getPromptCategorySlug(item);
    const rawKey = categorySlug.toLowerCase();
    const key = rawKey
      .replace(/&/g, 'and')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    return CATEGORY_META[key] || {
      title:
        (typeof item === 'object' && item?.name) ||
        categorySlug.replace(/-/g, ' ') ||
        'Category',
      subtitle: 'Explore prompts in this category',
      image: null,
    };
  }, []);


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
      </Animated.View>
    ),
    [staticPrompts, handlePromptPress],
  );

  const renderCategoryItem = useCallback(
    ({ item }: { item: any }) => {
      const meta = getCategoryMeta(item);
      const categorySlug = getPromptCategorySlug(item);
      const progress = formatCategoryProgress(
        item.answered_prompts ?? item.answeredCount,
        item.total_prompts ?? item.prompts_count ?? item.totalCount
      );

      return (
        <CategoryCard
          title={meta.title}
          subtitle={meta.subtitle}
          image={meta.image}
          progressLabel={progress?.label}
          isComplete={progress?.isComplete}
          onPress={
            categorySlug ? () => handleOpenCategory(categorySlug) : undefined
          }
        />
      );
    },
    [getCategoryMeta, handleOpenCategory],
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
          <FlatList
            data={categories}
            keyExtractor={(item, i) => getPromptCategorySlug(item) || String(i)}
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
