import React from 'react';
import { View, ScrollView } from 'react-native';
import { Skeleton } from './Skeleton';

export function ExploreSkeleton() {
  return (
    <ScrollView 
      showsVerticalScrollIndicator={false} 
      contentContainerClassName="px-4 pt-4 pb-24"
    >
      {/* Editorial Intro Description */}
      <View className="gap-2 mb-10">
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-4/5 rounded-md" />
      </View>

      {/* Continue Reflecting Section */}
      <View className="mb-10 gap-4">
        <Skeleton className="h-6 w-44 rounded-lg" />
        <View className="flex-row gap-3">
          <Skeleton className="h-[220px] w-[280px] rounded-[24px]" />
          <Skeleton className="h-[220px] w-[280px] rounded-[24px]" />
        </View>
      </View>

      {/* Explore Categories Title */}
      <Skeleton className="h-6 w-40 rounded-lg mb-4" />

      {/* Category Cards (~340px each, rounded-[32px]) */}
      <View className="gap-5">
        <View className="w-full rounded-[32px] overflow-hidden bg-card border border-stroke-weaker">
          <Skeleton className="w-full h-52 rounded-none" />
          <View className="p-7 gap-3">
            <View className="flex-row items-center justify-between">
              <Skeleton className="h-7 w-48 rounded-lg" />
              <Skeleton className="size-10 rounded-full" />
            </View>
            <Skeleton className="h-4 w-3/4 rounded-md" />
            <Skeleton className="h-6 w-24 rounded-full mt-1" />
          </View>
        </View>

        <View className="w-full rounded-[32px] overflow-hidden bg-card border border-stroke-weaker">
          <Skeleton className="w-full h-52 rounded-none" />
          <View className="p-7 gap-3">
            <View className="flex-row items-center justify-between">
              <Skeleton className="h-7 w-40 rounded-lg" />
              <Skeleton className="size-10 rounded-full" />
            </View>
            <Skeleton className="h-4 w-2/3 rounded-md" />
            <Skeleton className="h-6 w-28 rounded-full mt-1" />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
