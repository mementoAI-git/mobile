import React from 'react';
import { View, ScrollView } from 'react-native';
import { Skeleton } from './Skeleton';

export function StoriesSkeleton() {
  return (
    <ScrollView 
      showsVerticalScrollIndicator={false} 
      contentContainerClassName="px-5 pt-4 pb-24 gap-6"
    >
      {/* Editorial Intro Paragraph */}
      <View className="gap-2">
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-3/4 rounded-md" />
      </View>

      {/* Stat Cards: 1 row with 2 side-by-side cards */}
      <View className="flex-row gap-4">
        <Skeleton className="h-[104px] flex-1 rounded-[24px]" />
        <Skeleton className="h-[104px] flex-1 rounded-[24px]" />
      </View>

      {/* Search Input then Filter Pills */}
      <View className="gap-4">
        <Skeleton className="h-12 w-full rounded-full" />
        <View className="flex-row gap-2.5">
          <Skeleton className="h-9 w-20 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </View>
      </View>

      {/* 2-Column Masonry Grid Skeletons */}
      <View className="flex-row gap-4">
        {/* Left Column */}
        <View className="flex-1 gap-4">
          <Skeleton className="h-[210px] w-full rounded-[20px]" />
          <Skeleton className="h-[160px] w-full rounded-[20px]" />
          <Skeleton className="h-[230px] w-full rounded-[20px]" />
        </View>
        {/* Right Column */}
        <View className="flex-1 gap-4">
          <Skeleton className="h-[170px] w-full rounded-[20px]" />
          <Skeleton className="h-[240px] w-full rounded-[20px]" />
          <Skeleton className="h-[180px] w-full rounded-[20px]" />
        </View>
      </View>
    </ScrollView>
  );
}
