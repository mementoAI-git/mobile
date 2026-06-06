import React, { useCallback } from 'react';
import { View, FlatList, RefreshControl, ImageBackground, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CategoryCard } from '@/components/explore/CategoryCard';
import { ContinueReflectingCard } from '@/components/explore/ContinueReflectingCard';
import { DashboardHeader, ExploreSkeleton, EmptyState, Spinner } from '@/components/ui';
import { COLORS, FONTS } from '@/constants/tokens';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useExploreLogic } from '@/hooks/use-explore-logic';
import { useFocusEffect } from 'expo-router';

const PATTERN = require('../../../assets/images/backgrounds/welcome_bg.png');

const CATEGORY_META: Record<string, { title: string; subtitle: string; image: any }> = {
  career: {
    title: 'Career & Ambition',
    subtitle: "Aspirations and goals you've set to achieve professional success and personal fulfillment.",
    image: require('../../../assets/images/categories/career.png'),
  },
  family: {
    title: 'Family Life',
    subtitle: "The bonds, traditions, and stories that define your home and heritage.",
    image: require('../../../assets/images/categories/family.png'),
  },
  relationship: {
    title: 'Love & Relationships',
    subtitle: "The people who shape your heart and the lessons learned through connection.",
    image: require('../../../assets/images/categories/relationship.png'),
  },
  belief: {
    title: 'Worldviews & Beliefs',
    subtitle: "The principles and convictions that guide your perspective on life.",
    image: require('../../../assets/images/categories/belief.png'),
  },
  purpose: {
    title: 'Finding Purpose',
    subtitle: "Discovering what gives your life meaning and how you contribute to the world.",
    image: require('../../../assets/images/categories/purpose.png'),
  },
  'life-transition': {
    title: 'Life Transitions',
    subtitle: "Moments of growth, uncertainty, and reinvention through major changes.",
    image: require('../../../assets/images/categories/life-transition.png'),
  },
  wellbeing: {
    title: 'Wellbeing & Daily Life',
    subtitle: "Everyday rhythms — how you care for yourself and find your inner balance.",
    image: require('../../../assets/images/categories/wellbeing.png'),
  },
  identity: {
    title: 'Identity & Self-Discovery',
    subtitle: "Reflections on who you are, what you believe, and how you've evolved.",
    image: require('../../../assets/images/categories/identify.png'),
  },
};

export default function ExploreScreen() {
  const {
    categories,
    staticPrompts,
    isLoading,
    isStartingConversation,
    refetch,
    isRefetching,
    handleOpenCategory,
    handlePromptPress,
    handleBackToOverview,
  } = useExploreLogic();

  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
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
              <Animated.Text className="text-sm text-text-strong" style={{ fontFamily: FONTS.sansBold }}>Starting reflect session...</Animated.Text>
            </View>
          </View>
        )}

        {isLoading && !categories.length ? (
          <ExploreSkeleton />
        ) : (
          <FlatList
            data={categories}
            keyExtractor={(item, i) => item._id ?? String(i)}
            ListHeaderComponent={
              <Animated.View entering={FadeInDown.duration(600)} className="pt-4 pb-6">
                <Animated.Text className="text-base text-text-weak leading-relaxed mb-6" style={{ fontFamily: FONTS.sans }}>
                  Discover prompts that help you explore the depths of your story and find new ways to connect.
                </Animated.Text>

                {staticPrompts.length > 0 && (
                  <View className="mb-6">
                    <Animated.Text className="text-[22px] text-text-strong font-normal mb-4" style={{ fontFamily: FONTS.serif }}>
                      Continue reflecting
                    </Animated.Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingLeft: 24, paddingRight: 8, paddingBottom: 8 }}
                      className="-mx-6"
                    >
                      {staticPrompts.map((prompt) => (
                        <ContinueReflectingCard
                          key={prompt._id}
                          title={prompt.title || ''}
                          onPress={() => handlePromptPress(prompt)}
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}

                <Animated.Text className="text-[22px] text-text-strong font-normal mb-4" style={{ fontFamily: FONTS.serif }}>
                  Explore categories
                </Animated.Text>
              </Animated.View>
            }
            contentContainerClassName="px-6 pb-24 flex-grow"
            showsVerticalScrollIndicator={false}
            renderItem={useCallback(({ item }: { item: any }) => {
              const meta = CATEGORY_META[item.slug || item.name?.toLowerCase()] || {
                title: item.name || 'Category',
                subtitle: 'Explore prompts in this category',
                image: null,
              };
              return (
                <CategoryCard
                  title={meta.title}
                  subtitle={meta.subtitle}
                  image={meta.image}
                  onPress={() => handleOpenCategory(item._id ?? item.name)}
                />
              );
            // eslint-disable-next-line react-hooks/exhaustive-deps
            }, [handleOpenCategory])}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.brand} />
            }
            ListEmptyComponent={
              <EmptyState
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
