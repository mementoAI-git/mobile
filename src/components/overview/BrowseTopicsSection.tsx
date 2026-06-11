import React from 'react';
import { View, ScrollView, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, FONTS } from '@/constants/tokens';
import { Skeleton } from '@/components/ui/Skeleton';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { TopicCard } from './TopicCard';

interface Props {
  prompts: any[];
  isLoading: boolean;
}

const CATEGORY_META: Record<string, { image: any }> = {
  career: { image: require('../../../assets/images/categories/career.png') },
  family: { image: require('../../../assets/images/categories/family.png') },
  relationship: { image: require('../../../assets/images/categories/relationship.png') },
  belief: { image: require('../../../assets/images/categories/belief.png') },
  purpose: { image: require('../../../assets/images/categories/purpose.png') },
  'life-transition': { image: require('../../../assets/images/categories/life-transition.png') },
  wellbeing: { image: require('../../../assets/images/categories/wellbeing.png') },
  identity: { image: require('../../../assets/images/categories/identify.png') },
};

export function BrowseTopicsSection({ prompts, isLoading }: Props) {
  const router = useRouter();

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
        <TouchableOpacity onPress={() => router.push('/(tabs)/explore')} activeOpacity={0.7}>
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
        {prompts.map((t, i) => {
          const cat = t.category?.toLowerCase() || 'wellbeing';
          const meta = CATEGORY_META[cat] || CATEGORY_META['wellbeing'];

          return (
            <TopicCard
              key={i}
              title={t.title}
              image={meta.image}
              category={t.category}
              onPress={() => router.push({
                pathname: '/chat/[id]',
                params: { id: t._id, title: t.title }
              })}
            />
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}
