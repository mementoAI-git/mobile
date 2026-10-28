import React, { useCallback, useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { useRouter } from 'expo-router';
import { getCategoryMeta } from '@/constants/categories';
import { getExploreCategoryTitle } from '@/features/explore/question-presentation';
import * as Haptics from 'expo-haptics';
import { TYPE } from '@/constants/typography';
import { Skeleton } from '@/components/ui/Skeleton';
import { useOverviewPrompts } from '@/hooks/queries/use-prompts';
import { useEnrichmentStats } from '@/hooks/use-enrichment-stats';
import { prioritizePromptsByEnrichment } from '@/features/prompts/prompt-prioritization';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { TopicCard } from './TopicCard';

// Isolated per-item component so each prompt's onPress is a stable useCallback
// rather than an inline closure recreated on every parent render.
function TopicCardItem({
  prompt,
  router,
}: {
  prompt: any;
  router: ReturnType<typeof useRouter>;
}) {
  const meta = getCategoryMeta(prompt.category);
  const categoryTitle = getExploreCategoryTitle(prompt.category);

  const handlePress = useCallback(() => {
    router.push({
      pathname: '/chat/[id]',
      params: {
        id: prompt._id || '',
        type: 'prompt',
        promptTitle: prompt.title || '',
        promptLabel: categoryTitle,
      },
    });
  }, [router, prompt._id, prompt.title, categoryTitle]);

  return (
    <TopicCard
      title={prompt.title}
      image={meta?.image}
      category={categoryTitle}
      onPress={handlePress}
    />
  );
}

const MemoTopicCardItem = React.memo(TopicCardItem);

export function BrowseTopicsSection() {
  const { data: overviewTopics, isLoading: promptsLoading } = useOverviewPrompts();
  const { stats, isLoading: statsLoading } = useEnrichmentStats();
  const rawPrompts = overviewTopics || [];
  const router = useRouter();

  const prioritizedPrompts = useMemo(() => {
    return prioritizePromptsByEnrichment(rawPrompts, stats);
  }, [rawPrompts, stats]);

  const handleSeeAll = useCallback(() => {
    Haptics.selectionAsync();
    router.push('/(tabs)/explore');
  }, [router]);

  if (promptsLoading || (statsLoading && !overviewTopics)) {
    return (
      <View className="gap-5">
        <Skeleton className="h-8 w-48 ml-1 rounded-full" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[180px] w-[220px] rounded-[24px]" />
          ))}
        </ScrollView>
      </View>
    );
  }

  if (prioritizedPrompts.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.delay(250)} className="gap-5">
      <View className="flex-row items-center justify-between px-1">
        <Animated.Text className="text-text-strong flex-1 pr-4" style={TYPE.sectionTitle}>
          Browse conversations <Animated.Text className="text-text-weak" style={TYPE.sectionTitleWeak}>by topics</Animated.Text>
        </Animated.Text>
        <TouchableOpacity onPress={handleSeeAll} accessibilityRole="button" accessibilityLabel="See all topics" className="min-h-11 justify-center shrink-0" activeOpacity={0.7}>
          <Animated.Text className="text-brand" style={TYPE.buttonSmall}>See all</Animated.Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-1 gap-5"
        snapToInterval={260}
        decelerationRate="fast"
      >
        {prioritizedPrompts.map((item, index) => (
          <MemoTopicCardItem
            key={item.prompt._id || item.prompt.title || index}
            prompt={item.prompt}
            router={router}
          />
        ))}
      </ScrollView>
    </Animated.View>
  );
}
