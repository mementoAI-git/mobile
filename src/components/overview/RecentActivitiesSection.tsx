import React, { useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { TYPE } from '@/constants/typography';
import { Skeleton } from '@/components/ui/Skeleton';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useActivities, type Activity } from '@/hooks/queries/use-activities';
import { ActivityListItem } from './ActivityListItem';

export function RecentActivitiesSection() {
  const { data: activitiesData, isLoading } = useActivities({ page: 1, limit: 4 });
  const activities = activitiesData?.docs || [];
  const router = useRouter();

  const handleSeeAll = useCallback(() => {
    router.push('/settings/activities' as any);
  }, [router]);

  if (isLoading) {
    return (
      <View className="gap-4">
        <Skeleton className="h-8 w-40 ml-1 rounded-full" />
        <View className="bg-white border border-stroke-weaker rounded-[32px] p-2">
          {[1, 2, 3].map((i) => (
            <View key={i} className="flex-row items-center gap-4 p-4">
              <Skeleton className="size-11 rounded-2xl" />
              <View className="flex-1 gap-2">
                <Skeleton className="h-4 w-full rounded-full" />
                <Skeleton className="h-3 w-20 rounded-full" />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (!activities || activities.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.delay(300)} className="gap-4">
      <View className="flex-row items-center justify-between px-1">
        <Animated.Text className="text-text-strong" style={TYPE.sectionTitle}>
          Recent <Animated.Text className="text-text-weak italic">Activities</Animated.Text>
        </Animated.Text>
        <TouchableOpacity onPress={handleSeeAll} activeOpacity={0.7}>
          <Animated.Text className="text-brand" style={TYPE.buttonSmall}>See all</Animated.Text>
        </TouchableOpacity>
      </View>

      <View className="bg-white border border-stroke-weaker rounded-[32px] overflow-hidden">
        {activities.map((activity, index) => (
          <ActivityListItem
            key={activity._id || index}
            activity={activity}
            showDivider={index > 0}
            fromOverview
          />
        ))}
      </View>
    </Animated.View>
  );
}
