import React from 'react';
import { View } from 'react-native';
import { Skeleton } from './Skeleton';

export function ChatSkeleton() {
  return (
    <View className="flex-1 px-4 pt-4 pb-32 gap-6 bg-background">
      {/* AI Message with Avatar */}
      <View className="self-start flex-row items-end gap-2.5 max-w-[80%]">
        <Skeleton className="size-8 rounded-full shrink-0" />
        <View className="gap-2 flex-1">
          <Skeleton className="h-[64px] rounded-3xl rounded-bl-lg" />
          <Skeleton className="h-3 w-20 ml-1 rounded-full" />
        </View>
      </View>

      {/* User Message */}
      <View className="self-end max-w-[70%] gap-2 items-end">
        <Skeleton className="h-[48px] w-48 rounded-3xl rounded-br-lg" />
        <Skeleton className="h-3 w-16 mr-1 rounded-full" />
      </View>

      {/* AI Message Long with Avatar */}
      <View className="self-start flex-row items-end gap-2.5 max-w-[85%]">
        <Skeleton className="size-8 rounded-full shrink-0" />
        <View className="gap-2 flex-1">
          <Skeleton className="h-[108px] rounded-3xl rounded-bl-lg" />
          <Skeleton className="h-3 w-24 ml-1 rounded-full" />
        </View>
      </View>

      {/* User Message Short */}
      <View className="self-end max-w-[50%] gap-2 items-end">
        <Skeleton className="h-[44px] w-32 rounded-3xl rounded-br-lg" />
        <Skeleton className="h-3 w-14 mr-1 rounded-full" />
      </View>
    </View>
  );
}
