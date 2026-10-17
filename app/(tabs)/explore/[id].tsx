import React from 'react';
import { View, FlatList, ImageBackground, Image, RefreshControl } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import Inbox from 'lucide-react-native/icons/inbox';
import { Spinner, ExploreSkeleton, EmptyState, Tabs, Button } from '@/components/ui';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import Animated from 'react-native-reanimated';
import { useCategoryPromptsLogic } from '@/hooks/use-category-prompts-logic';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import type { IPrompt } from '@/types';

const PATTERN = require('../../../assets/images/backgrounds/welcome_bg.png');
const QUESTION_ICON = require('../../../assets/images/question-2.png');

const TOPIC_TABS = [
  { key: 'all', label: 'All topics' },
  { key: 'answered', label: 'Answered' },
];

const ExploreTopicItem = React.memo(function ExploreTopicItem({ prompt, onPress }: {
  prompt: IPrompt;
  onPress: (prompt: IPrompt) => void;
}) {
  const handlePress = React.useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress(prompt);
  }, [prompt, onPress]);
  return (
    <View
      className="bg-card rounded-2xl p-5 border border-stroke-weaker shadow-sm gap-4 relative"
    >
      {/* Question Tag */}
      <View className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-brand/5 border border-brand/10">
        <Animated.Text className="text-brand capitalize" style={TYPE.eyebrow}>
          Question
        </Animated.Text>
      </View>

      {/* Main content: icon + question */}
      <View className="flex-row items-start gap-4 pr-12">
        <View className="size-14 items-center justify-center bg-fill-weaker rounded-2xl border border-stroke-weaker">
          <Image
            source={QUESTION_ICON}
            className="size-9"
            resizeMode="contain"
          />
        </View>
        <View className="flex-1 pt-1">
          <Animated.Text
            className="text-text-strong"
            style={TYPE.cardTitle}
          >
            {prompt.title}
          </Animated.Text>
        </View>
      </View>

      {/* Action reply button */}
      <View className="flex-row pt-2">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handlePress}
          accessibilityRole="button"
          className="min-h-11 justify-center px-5 py-2 rounded-full border border-stroke-strong bg-white active:bg-fill-weaker"
        >
          <Animated.Text
            className="text-text-strong"
            style={TYPE.buttonSmall}
          >
            Reflect
          </Animated.Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function CategoryPromptsScreen() {
  const {
    id,
    prompts,
    totalDocs,
    categoryMeta,
    activeTab,
    handleTabChange,
    usingBundledCatalog,
    isError,
    handleLoadMore,
    handleRetryTopics,
    isFetchingNextPage,
    isLoading,
    isRefetching,
    refetch,
    refetchIfStale,
    isPending,
    handlePromptPress,
    handleBack,
  } = useCategoryPromptsLogic();

  useFocusEffect(
    React.useCallback(() => {
      refetchIfStale();
    }, [refetchIfStale])
  );

  const handleBackPress = React.useCallback(() => {
    Haptics.selectionAsync();
    handleBack();
  }, [handleBack]);
  const handleRetryPress = React.useCallback(() => {
    Haptics.selectionAsync();
    refetch();
  }, [refetch]);

  const renderPromptItem = React.useCallback(
    ({ item }: { item: IPrompt }) => <ExploreTopicItem prompt={item} onPress={handlePromptPress} />,
    [handlePromptPress],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-6 py-4 border-b border-stroke-weaker bg-card shadow-sm">
        <TouchableOpacity
          onPress={handleBackPress}
          accessibilityRole="button"
          accessibilityLabel="Back to Explore"
          activeOpacity={0.7}
          className="size-11 rounded-full bg-fill-weaker border border-stroke-weaker items-center justify-center -ml-2"
        >
          <ChevronLeft size={20} color={COLORS.textBase} />
        </TouchableOpacity>
        <Animated.Text
          className="text-text-strong capitalize flex-1 pr-6"
          numberOfLines={1}
          style={TYPE.screenTitle}
        >
          {categoryMeta.title}
        </Animated.Text>
      </View>

      <View className="flex-1 relative">
        <ImageBackground source={PATTERN} className="absolute inset-0 opacity-[0.03]" />

        {isPending && (
          <View className="absolute inset-0 bg-black/10 items-center justify-center z-50">
            <View className="bg-white p-6 rounded-2xl shadow-lg border border-stroke-weaker items-center gap-3">
              <Spinner size="large" color={COLORS.brand} />
              <Animated.Text className="text-text-strong" style={TYPE.label}>Starting your reflection…</Animated.Text>
            </View>
          </View>
        )}

        {isLoading && !prompts.length ? (
          <View className="flex-1">
            <ExploreSkeleton />
          </View>
        ) : (
          <FlatList
            data={prompts}
            initialNumToRender={8}
            maxToRenderPerBatch={5}
            windowSize={5}
            removeClippedSubviews
            onEndReachedThreshold={0.3}
            onEndReached={handleLoadMore}
            ListFooterComponent={
              isFetchingNextPage ? <Spinner /> :
                isError && prompts.length > 0 ? <Button variant="secondary" onPress={handleRetryTopics}>Try again</Button> : null
            }
            keyExtractor={(item, index) => item._id ?? `prompt-${index}`}
            contentContainerClassName="p-5 pb-32 gap-5"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.brand} />
            }
            ListHeaderComponent={
              <View className="gap-6 pb-2">
                {/* Category Card Info */}
                <View className="bg-card rounded-[32px] overflow-hidden border border-stroke-weaker p-5 gap-4 shadow-sm">
                  {categoryMeta.image && (
                    <View className="w-full h-44 rounded-2xl overflow-hidden bg-fill-weak">
                      <Image
                        source={categoryMeta.image}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    </View>
                  )}
                  <View className="gap-2">
                    <Animated.Text
                      className="text-text-strong capitalize"
                      style={TYPE.screenTitle}
                    >
                      {categoryMeta.title}
                    </Animated.Text>
                    <Animated.Text
                      className="text-text-base opacity-80"
                      style={TYPE.body}
                    >
                      {categoryMeta.subtitle}
                    </Animated.Text>
                  </View>
                  {!usingBundledCatalog && id && !isError && (
                  <View className="flex-row">
                    <View className="px-3 py-1.5 rounded-full bg-fill-weaker border border-stroke-weaker flex-row items-center gap-1.5">
                      <View className="size-2 rounded-full bg-brand" />
                      <Animated.Text className="text-text-strong" style={TYPE.metadata}>
                        {totalDocs} {totalDocs === 1 ? 'topic' : 'topics'}
                      </Animated.Text>
                    </View>
                  </View>
                  )}
                </View>

                {!usingBundledCatalog && id && (
                  <Tabs
                    tabs={TOPIC_TABS}
                    activeKey={activeTab}
                    onTabChange={handleTabChange}
                    className="min-h-[52px]"
                  />
                )}
              </View>
            }
            renderItem={renderPromptItem}
            ListEmptyComponent={
              <EmptyState
                icon={Inbox}
                title={!id ? 'Find a new path' : usingBundledCatalog || isError ? 'A little pause in exploring' : activeTab === 'answered' ? 'Your reflections start here' : 'More stories to discover'}
                description={!id ? 'Choose a category to keep exploring your story.' : usingBundledCatalog ? 'Questions are temporarily unavailable while Explore is being updated. Please try again shortly.' : isError ? 'We couldn’t load your topics. Give it another try.' : activeTab === 'answered' ? 'The topics you answer in this category will appear here.' : 'New topics will appear here when they’re ready.'}
                actionLabel={!id ? 'Back to Explore' : usingBundledCatalog || isError ? 'Try again' : undefined}
                onAction={!id ? handleBackPress : handleRetryPress}
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
