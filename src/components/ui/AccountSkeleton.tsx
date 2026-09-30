import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Skeleton } from './Skeleton';
import { screenGutter } from '@/constants/responsive';

export function AccountSkeleton() {
  const { width } = useWindowDimensions();
  return (
    <View style={{ paddingHorizontal: screenGutter(width), gap: 24 }}>
      <Skeleton className="h-[164px] rounded-[28px]" />
      <View className="gap-4 py-2">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 gap-3 pr-5">
            <Skeleton className="h-9 w-3/4 rounded-xl" />
            <Skeleton className="h-5 w-2/3 rounded-lg" />
            <Skeleton className="h-4 w-1/2 rounded-lg" />
          </View>
          <Skeleton className="size-20 rounded-full" />
        </View>
        <Skeleton className="h-16 rounded-xl" />
        <View className="flex-row gap-3">
          <Skeleton className="h-12 w-32 rounded-full" />
          <Skeleton className="h-12 w-36 rounded-full" />
        </View>
      </View>
      <Skeleton className="h-[292px] rounded-[28px]" />
      <Skeleton className="h-[360px] rounded-[28px]" />
    </View>
  );
}
