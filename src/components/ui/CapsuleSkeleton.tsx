import React from 'react';
import { View, ScrollView } from 'react-native';
import { Skeleton } from './Skeleton';

export function CapsuleSkeleton() {
  return (
    <ScrollView 
      showsVerticalScrollIndicator={false} 
      contentContainerClassName="px-4 pt-3 pb-8 gap-10"
    >
      <Skeleton className="h-4 w-64" />
      
      <Skeleton className="h-12 w-36 rounded-full" />

      {/* Stats cards */}
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

      {/* Filter chips */}
      <View className="flex-row gap-2">
        <Skeleton className="h-9 w-16 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-20 rounded-full" />
        <Skeleton className="h-9 w-20 rounded-full" />
      </View>

      {/* Capsule List Items */}
      <View className="gap-4">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </View>
    </ScrollView>
  );
}
