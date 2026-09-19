import React from 'react';
import { View, ScrollView } from 'react-native';
import { Skeleton } from './Skeleton';

export function OverviewSkeleton() {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerClassName="px-6 pt-6 pb-32 gap-8"
    >
      {/* Editorial Greeting Skeleton (40px icon + 2-line heading) */}
      <View className="flex-row items-start gap-4">
        <Skeleton className="size-10 rounded-full" />
        <View className="flex-1 gap-2">
          <Skeleton className="h-7 w-48 rounded-lg" />
          <Skeleton className="h-7 w-32 rounded-lg" />
        </View>
      </View>

      {/* Hero Section: Header with streak pill + MemoryPromptCard */}
      <View className="gap-6">
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Skeleton className="h-5 w-44 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </View>
          {/* MemoryPromptCard Skeleton */}
          <Skeleton className="h-[170px] w-full rounded-[18px]" />
        </View>

        {/* DailyPromptSection Placeholder */}
        <Skeleton className="h-[180px] w-full rounded-3xl" />
      </View>

      {/* Journey Stat Cards (Vertical Stack of 4 full-width cards) */}
      <View className="gap-3">
        <Skeleton className="h-[100px] w-full rounded-2xl" />
        <Skeleton className="h-[100px] w-full rounded-2xl" />
        <Skeleton className="h-[100px] w-full rounded-2xl" />
        <Skeleton className="h-[100px] w-full rounded-2xl" />
      </View>

      {/* Enrichment Hero Card (Placed after stat cards) */}
      <Skeleton className="h-[140px] w-full rounded-2xl" />

      {/* Calendar Card Skeleton (~340px) */}
      <Skeleton className="h-[340px] w-full rounded-[24px]" />
    </ScrollView>
  );
}
