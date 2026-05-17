import React from 'react';
import { View, ScrollView } from 'react-native';
import { Skeleton } from './Skeleton';

export function StoriesSkeleton() {
  return (
    <ScrollView 
      showsVerticalScrollIndicator={false} 
      contentContainerClassName="px-5 pt-3 pb-8 gap-6"
    >
      <Skeleton className="h-4 w-40" />
      
      {/* Action Buttons Row */}
      <View className="flex-row items-center gap-2">
        <Skeleton className="h-10 flex-1 rounded-full" />
        <Skeleton className="h-10 flex-1 rounded-full" />
        <Skeleton className="h-10 flex-1 rounded-full" />
      </View>

      {/* Stat cards */}
      <View className="gap-3">
        <Skeleton className="h-[99px] rounded-2xl" />
        <Skeleton className="h-[99px] rounded-2xl" />
        <Skeleton className="h-[99px] rounded-2xl" />
      </View>

      {/* Filter chips & search */}
      <View className="gap-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row gap-2">
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </View>
          <Skeleton className="h-8 w-16 rounded-lg" />
        </View>
        <Skeleton className="h-11 rounded-xl" />
      </View>

      {/* Memory List Items */}
      <View className="gap-4">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </View>
    </ScrollView>
  );
}
