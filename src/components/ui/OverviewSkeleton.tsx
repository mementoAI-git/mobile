import React from 'react';
import { View, ScrollView } from 'react-native';
import { Skeleton } from './Skeleton';

export function OverviewSkeleton() {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerClassName="px-4 pt-6 pb-32 gap-10"
    >
      <View className="gap-10">
        {/* Greeting and primary action are separate sections. */}
        <View className="flex-row items-start gap-4">
          <Skeleton className="size-10 rounded-full" />
          <View className="flex-1 gap-2">
            <Skeleton className="h-7 w-48 rounded-lg" />
            <Skeleton className="h-7 w-32 rounded-lg" />
          </View>
        </View>
        <Skeleton className="h-[170px] w-full rounded-[18px]" />
      </View>

      <Skeleton className="h-[220px] w-full rounded-[24px]" />

      {/* Journey Stat Cards (Vertical Stack of 4 full-width cards) */}
      <View className="gap-3">
        <Skeleton className="h-[96px] w-full rounded-2xl" />
        <Skeleton className="h-[96px] w-full rounded-2xl" />
        <Skeleton className="h-[96px] w-full rounded-2xl" />
        <Skeleton className="h-[96px] w-full rounded-2xl" />
      </View>

      {/* Enrichment Hero Card (Placed after stat cards) */}
      <Skeleton className="h-[140px] w-full rounded-2xl" />

      {/* Calendar Card Skeleton (~340px) */}
      <Skeleton className="h-[340px] w-full rounded-[24px]" />
    </ScrollView>
  );
}
