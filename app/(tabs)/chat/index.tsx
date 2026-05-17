import React from 'react';
import { View, FlatList, RefreshControl, ImageBackground, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, MessageSquare } from 'lucide-react-native';
import { ConversationBar } from '@/components/memory/ConversationBar';
import { Spinner, DashboardHeader, Skeleton } from '@/components/ui';
import { COLORS, FONTS } from '@/constants/tokens';
import Animated from 'react-native-reanimated';
import { useChatListLogic } from '@/hooks/use-chat-list-logic';

const PATTERN = require('../../../assets/images/backgrounds/welcome_bg.png');

function ChatListSkeleton() {
  return (
    <View className="flex-1 p-5 gap-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} className="flex-row items-center bg-white border border-stroke-weaker p-4 rounded-[20px] shadow-sm gap-4">
          <Skeleton className="size-12 rounded-full" />
          <View className="flex-1 gap-2">
            <Skeleton className="h-4 w-[40%] rounded-md" />
            <Skeleton className="h-3 w-[85%] rounded-md" />
          </View>
          <Skeleton className="h-3 w-12 rounded-md" />
        </View>
      ))}
    </View>
  );
}

export default function ChatListScreen() {
  const {
    conversations,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
    isRefetching,
    handleNew,
    handleOpenChat,
    starting,
  } = useChatListLogic();

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <DashboardHeader title="Chats" />
        <ChatListSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <DashboardHeader
        title="Chats"
        rightElement={
          <TouchableOpacity
            onPress={handleNew}
            disabled={starting}
            activeOpacity={0.8}
            className="flex-row items-center gap-2 bg-brand rounded-full px-5 h-10 shadow-lg shadow-brand/20"
          >
            {starting ? (
              <Spinner size="small" color="white" />
            ) : (
              <>
                <Plus size={16} color="white" />
                <Animated.Text className="text-sm font-semibold text-white" style={{ fontFamily: FONTS.sansSemi }}>
                  New
                </Animated.Text>
              </>
            )}
          </TouchableOpacity>
        }
      />

      <View className="flex-1 relative">
        <ImageBackground source={PATTERN} className="absolute inset-0 opacity-30" />

        <FlatList
          data={conversations}
          keyExtractor={(item) => item._id}
          contentContainerClassName="p-5 pb-24"
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View className="h-3" />}
          renderItem={({ item }) => (
            <ConversationBar
              memory={item}
              onPress={() => handleOpenChat(item._id)}
            />
          )}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.brand} />
          }
          ListFooterComponent={isFetchingNextPage ? <Spinner /> : null}
          ListEmptyComponent={
            <View className="items-center justify-center py-20 gap-6">
              <View className="size-20 bg-fill-weaker rounded-full items-center justify-center border border-stroke-weaker">
                <MessageSquare size={32} color={COLORS.textDisabled} strokeWidth={1.5} />
              </View>
              <View className="gap-2 items-center">
                <Animated.Text className="text-xl text-text-strong" style={{ fontFamily: FONTS.serif }}>
                  No chats yet
                </Animated.Text>
                <Animated.Text
                  className="text-base text-text-weak text-center px-12 leading-relaxed"
                  style={{ fontFamily: FONTS.sans }}
                >
                  Start a new chat to begin preserving your memories with AI.
                </Animated.Text>
              </View>
              <TouchableOpacity
                onPress={handleNew}
                activeOpacity={0.8}
                className="flex-row items-center gap-2 bg-brand rounded-full px-8 py-4 mt-2 shadow-lg shadow-brand/20"
              >
                <Plus size={16} color="white" />
                <Animated.Text className="text-base font-bold text-white" style={{ fontFamily: FONTS.sansBold }}>
                  Start your first chat
                </Animated.Text>
              </TouchableOpacity>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}
