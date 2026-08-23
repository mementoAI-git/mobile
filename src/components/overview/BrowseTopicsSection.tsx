import React, { useCallback } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { FONTS } from '@/constants/tokens';
import { Skeleton } from '@/components/ui/Skeleton';
import { useOverviewPrompts } from '@/hooks/queries/use-prompts';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { TopicCard } from './TopicCard';

const CATEGORY_META: Record<string, { image: any }> = {
  career: { image: require('../../../assets/images/categories/career.webp') },
  family: { image: require('../../../assets/images/categories/family.webp') },
  relationship: { image: require('../../../assets/images/categories/relationship.webp') },
  belief: { image: require('../../../assets/images/categories/belief.webp') },
  purpose: { image: require('../../../assets/images/categories/purpose.webp') },
  'life-transition': { image: require('../../../assets/images/categories/life-transition.webp') },
  wellbeing: { image: require('../../../assets/images/categories/wellbeing.webp') },
  identity: { image: require('../../../assets/images/categories/identify.webp') },
};

// Isolated per-item component so each prompt's onPress is a stable useCallback
// rather than an inline closure recreated on every parent render.
function TopicCardItem({ prompt, router }: { prompt: any; router: ReturnType<typeof useRouter> }) {
  const cat = prompt.category?.toLowerCase() || 'wellbeing';
  const meta = CATEGORY_META[cat] || CATEGORY_META['wellbeing'];

  const handlePress = useCallback(() => {
    router.push({
      pathname: '/chat/[id]',
      params: {
        id: prompt._id || '',
        type: 'prompt',
        promptTitle: prompt.title || '',
        promptLabel: prompt.category || '',
      },
    });
  }, [router, prompt._id, prompt.title, prompt.category]);

  return (
    <TopicCard
      title={prompt.title}
      image={meta.image}
      category={prompt.category}
      onPress={handlePress}
    />
  );
}

const MemoTopicCardItem = React.memo(TopicCardItem);

export function BrowseTopicsSection() {
  const { data: overviewTopics, isLoading } = useOverviewPrompts();
  const prompts = overviewTopics || [];
  const router = useRouter();

  const handleSeeAll = useCallback(() => {
    router.push('/(tabs)/explore');
  }, [router]);

  if (isLoading) {
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

  if (!prompts || prompts.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.delay(250)} className="gap-5">
      <View className="flex-row items-center justify-between px-1">
        <Animated.Text className="text-xl text-text-strong" style={{ fontFamily: FONTS.serif }}>
          Browse conversations <Animated.Text className="text-text-weak italic">by topics</Animated.Text>
        </Animated.Text>
        <TouchableOpacity onPress={handleSeeAll} activeOpacity={0.7}>
          <Animated.Text className="text-sm text-brand font-semibold" style={{ fontFamily: FONTS.sansSemi }}>See all</Animated.Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-1 gap-5"
        snapToInterval={240}
        decelerationRate="fast"
      >
        {prompts.map((t, i) => (
          <MemoTopicCardItem key={t._id || i} prompt={t} router={router} />
        ))}
      </ScrollView>
    </Animated.View>
  );
}

