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

      {/* Category rows: text left, square cover right, hairline between rows */}
      <View>
        {[0, 1, 2].map((row) => (
          <View key={row} className="flex-row items-center gap-4 py-4 border-t border-stroke-weak">
            <View className="flex-1 gap-2">
              <Skeleton className="h-5 w-4/5 rounded-md" />
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-3/5 rounded-md" />
              <Skeleton className="h-3 w-24 rounded-md mt-1" />
            </View>
            <Skeleton className="size-32 rounded-2xl" />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
