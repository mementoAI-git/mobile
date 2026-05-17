import React from 'react';
import { View, ScrollView } from 'react-native';
import { Skeleton } from './Skeleton';

export function OverviewSkeleton() {
  return (
    <ScrollView 
      showsVerticalScrollIndicator={false} 
      contentContainerClassName="px-4 pt-6 pb-10 gap-6"
    >
      {/* Greeting Skeleton */}
      <View className="flex-row items-center gap-3">
        <Skeleton className="size-6 rounded-full" />
        <Skeleton className="h-8 w-48" />
      </View>

      {/* Hero Action Skeleton */}
      <Skeleton className="h-[180px] rounded-3xl" />

      {/* Enrichment Score Skeleton */}
      <Skeleton className="h-[140px] rounded-3xl" />

      {/* Stat Cards Skeleton */}
      <View className="gap-3">
        <View className="flex-row gap-3">
          <Skeleton className="h-[99px] flex-1 rounded-2xl" />
          <Skeleton className="h-[99px] flex-1 rounded-2xl" />
        </View>
        <View className="flex-row gap-3">
          <Skeleton className="h-[99px] flex-1 rounded-2xl" />
          <Skeleton className="h-[99px] flex-1 rounded-2xl" />
        </View>
      </View>

      {/* Daily Prompt Skeleton */}
      <Skeleton className="h-[140px] rounded-2xl" />
    </ScrollView>
  );
}
