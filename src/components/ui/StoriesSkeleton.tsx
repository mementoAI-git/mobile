import React from 'react';
import { View, ScrollView } from 'react-native';
import { Skeleton } from './Skeleton';

export function StoriesSkeleton({ viewMode = 'grid' }: { viewMode?: 'grid' | 'list' }) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-4 pb-24 gap-4">
      {viewMode === 'list' ? (
        <View className="gap-4">
          <Skeleton className="h-[280px] w-full rounded-[14px]" />
          <Skeleton className="h-[280px] w-full rounded-[14px]" />
        </View>
      ) : (
        <View className="flex-row gap-2.5">
          <View className="flex-1 gap-4">
            <Skeleton className="h-[210px] w-full rounded-[14px]" />
            <Skeleton className="h-[160px] w-full rounded-[14px]" />
            <Skeleton className="h-[230px] w-full rounded-[14px]" />
          </View>
          <View className="flex-1 gap-4">
            <Skeleton className="h-[170px] w-full rounded-[14px]" />
            <Skeleton className="h-[240px] w-full rounded-[14px]" />
            <Skeleton className="h-[180px] w-full rounded-[14px]" />
          </View>
        </View>
      )}
    </ScrollView>
  );
}
