import React from 'react';
import { View, ScrollView } from 'react-native';
import { Skeleton } from './Skeleton';

export function ExploreSkeleton() {
  return (
    <ScrollView 
      showsVerticalScrollIndicator={false} 
      contentContainerClassName="px-4 pt-3 pb-8 gap-4"
    >
      <Skeleton className="h-[240px] rounded-3xl" />
      <Skeleton className="h-[240px] rounded-3xl" />
      <Skeleton className="h-[240px] rounded-3xl" />
    </ScrollView>
  );
}
