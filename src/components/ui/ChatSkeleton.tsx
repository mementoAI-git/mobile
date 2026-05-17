import React from 'react';
import { View } from 'react-native';
import { Skeleton } from './Skeleton';

export function ChatSkeleton() {
  return (
    <View className="flex-1 px-4 py-6 gap-6 bg-background">
      {/* AI Message */}
      <View className="self-start w-[70%] gap-2">
        <Skeleton className="h-[60px] rounded-2xl rounded-bl-sm" />
        <Skeleton className="h-3 w-20 ml-1" />
      </View>

      {/* User Message */}
      <View className="self-end w-[60%] gap-2">
        <Skeleton className="h-[44px] rounded-2xl rounded-br-sm" />
        <Skeleton className="h-3 w-16 mr-1 self-end" />
      </View>

      {/* AI Message Long */}
      <View className="self-start w-[80%] gap-2">
        <Skeleton className="h-[100px] rounded-2xl rounded-bl-sm" />
        <Skeleton className="h-3 w-24 ml-1" />
      </View>

      {/* User Message Short */}
      <View className="self-end w-[40%] gap-2">
        <Skeleton className="h-[44px] rounded-2xl rounded-br-sm" />
        <Skeleton className="h-3 w-16 mr-1 self-end" />
      </View>
    </View>
  );
}
