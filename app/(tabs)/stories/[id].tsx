import React from 'react';
import { View, Text, ScrollView, FlatList, ImageBackground, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Bookmark, BookmarkCheck, MoreHorizontal, Pencil, Trash2, Play, FileText, Download } from 'lucide-react-native';
import dayjs from 'dayjs';
import Animated from 'react-native-reanimated';
import { VideoView } from 'expo-video';
import { useVideoPlayer } from '@/hooks/use-video-player';
import * as WebBrowser from 'expo-web-browser';
import { Badge, Spinner, MemTag, Skeleton } from '@/components/ui';
import { COLORS, FONTS } from '@/constants/tokens';
import { useStoryDetailLogic } from '@/hooks/use-story-detail-logic';

const PATTERN = require('../../../assets/images/backgrounds/welcome_bg.png');

function VideoItem({ uri, style }: { uri: string; style?: any }) {
  const { player } = useVideoPlayer(uri, { loop: true, autoPlay: true });
  return (
    <VideoView
      player={player}
      style={style ?? { width: '100%', aspectRatio: 16 / 9 }}
      allowsFullscreen
      allowsPictureInPicture
      nativeControls
    />
  );
}

function StoryDetailSkeleton() {
  return (
    <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
      {/* Attachment hero media skeleton */}
      <Skeleton className="w-full aspect-video rounded-none" />

      <View className="px-5 pt-6 pb-16 gap-6">
        {/* Title skeleton */}
        <View className="gap-2">
          <Skeleton className="h-9 w-[90%] rounded-md" />
          <Skeleton className="h-9 w-[60%] rounded-md" />
        </View>

        {/* Metadata row skeleton */}
        <View className="flex-row items-center gap-3">
          <Skeleton className="h-5 w-28 rounded-md" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </View>

        <View className="h-px bg-stroke-weaker" />

        {/* Body content skeleton paragraphs */}
        <View className="gap-3">
          <Skeleton className="h-4.5 w-full rounded-md" />
          <Skeleton className="h-4.5 w-[96%] rounded-md" />
          <Skeleton className="h-4.5 w-[98%] rounded-md" />
          <Skeleton className="h-4.5 w-[92%] rounded-md" />
          <Skeleton className="h-4.5 w-[85%] rounded-md" />
        </View>

        <View className="gap-3 mt-4">
          <Skeleton className="h-4.5 w-full rounded-md" />
          <Skeleton className="h-4.5 w-[97%] rounded-md" />
          <Skeleton className="h-4.5 w-[94%] rounded-md" />
          <Skeleton className="h-4.5 w-[50%] rounded-md" />
        </View>
      </View>
    </ScrollView>
  );
}

export default function StoryDetailScreen() {
  const {
    router,
    memory,
    isLoading,
    handleBookmark,
    handleDelete,
    handleEdit,
    handleOpenActions,
    bookmarking,
    deleting,
    imageAttachments,
    otherAttachments,
  } = useStoryDetailLogic();

  const handleOpenFile = async (url?: string) => {
    if (url) {
      await WebBrowser.openBrowserAsync(url);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        {/* Header */}
        <View className="flex-row items-center gap-3 px-6 py-4 bg-background">
          <TouchableOpacity
            onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/(tabs)/stories'); } }}
            className="size-10 rounded-full bg-fill-weaker border border-stroke-weaker items-center justify-center -ml-2"
          >
            <ChevronLeft size={20} color={COLORS.textBase} />
          </TouchableOpacity>
          <View className="flex-1" />
          <View className="size-10 rounded-full bg-fill-weaker border border-stroke-weaker items-center justify-center">
            <Bookmark size={20} color={COLORS.textMuted} />
          </View>
        </View>
        <StoryDetailSkeleton />
      </SafeAreaView>
    );
  }
  if (!memory) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Animated.Text className="text-base text-text-weak" style={{ fontFamily: FONTS.sans }}>
          Memory not found.
        </Animated.Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-6 py-4 bg-background">
        <TouchableOpacity
          onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/(tabs)/stories'); } }}
          className="size-10 rounded-full bg-fill-weaker border border-stroke-weaker items-center justify-center -ml-2"
        >
          <ChevronLeft size={20} color={COLORS.textBase} />
        </TouchableOpacity>

        <View className="flex-1" />

        <TouchableOpacity
          onPress={handleBookmark}
          disabled={bookmarking}
          className="size-10 rounded-full items-center justify-center"
        >
          {memory.bookmarked
            ? <BookmarkCheck size={22} color={COLORS.brand} fill={COLORS.brand} />
            : <Bookmark size={22} color={COLORS.textWeak} />
          }
        </TouchableOpacity>

        <TouchableOpacity
          className="size-10 rounded-full items-center justify-center"
          onPress={handleOpenActions}
        >
          <MoreHorizontal size={22} color={COLORS.textWeak} />
        </TouchableOpacity>
      </View>

      <View className="flex-1 relative">
        <ImageBackground source={PATTERN} className="absolute inset-0 opacity-30" />

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Attachment image/video carousel */}
          {imageAttachments.length > 0 && (
            <View>
              {imageAttachments.length === 1 ? (
                imageAttachments[0].type?.startsWith('video/') ? (
                  <VideoItem
                    uri={imageAttachments[0].url || ''}
                    style={{ width: '100%', aspectRatio: 16 / 9 }}
                  />
                ) : (
                  // sharedTransitionTag is a Reanimated runtime prop not in static types — cast to any
                  <Animated.Image
                    {...{ sharedTransitionTag: `memory-image-${memory._id}` } as any}
                    source={{ uri: imageAttachments[0].url }}
                    className="w-full aspect-video"
                    resizeMode="cover"
                  />
                )
              ) : (
                <FlatList
                  data={imageAttachments}
                  keyExtractor={(a, i) => a.url ?? String(i)}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item, index }) => (
                    <View style={{ width: 320, aspectRatio: 16 / 9 }}>
                      {item.type?.startsWith('video/') ? (
                        <VideoItem
                          uri={item.url || ''}
                          style={{ width: '100%', height: '100%' }}
                        />
                      ) : (
                        <Animated.Image
                          {...(index === 0 ? { sharedTransitionTag: `memory-image-${memory._id}` } : {}) as any}
                          source={{ uri: item.url }}
                          style={{ width: '100%', height: '100%' }}
                          className="rounded-none"
                          resizeMode="cover"
                        />
                      )}
                    </View>
                  )}
                />
              )}
            </View>
          )}

          <View className="px-5 pt-6 pb-16 gap-4">
            {/* Title */}
            {/* sharedTransitionTag is a Reanimated runtime prop not in static TS types — spread cast */}
            <Animated.Text
              {...{ sharedTransitionTag: `memory-title-${memory._id}` } as any}
              className="text-3xl text-text-strong leading-tight"
              style={{ fontFamily: FONTS.serif }}
            >
              {memory.title || 'Untitled Memory'}
            </Animated.Text>

            {/* Metadata row */}
            <View className="flex-row items-center gap-2 flex-wrap">
              <Animated.Text className="text-sm text-text-weak" style={{ fontFamily: FONTS.sans }}>
                {dayjs(memory.created_at).format('MMMM D, YYYY')}
              </Animated.Text>
              <Badge
                label={memory.status}
                variant={memory.status === 'saved' ? 'success' : 'secondary'}
              />
            </View>

            <View className="h-px bg-stroke-weaker" />

            {/* Body */}
            <Animated.Text
              className="text-[18px] text-text-strong leading-[32px]"
              style={{ fontFamily: FONTS.serif }}
            >
              {memory.body?.replace(/<[^>]+>/g, '') ?? ''}
            </Animated.Text>

            {/* AI Summary */}
            {memory.summary && (
              <View className="bg-fill-weak rounded-2xl p-4 border border-stroke-weaker gap-2">
                <Animated.Text
                  className="text-xs font-semibold text-text-muted uppercase tracking-wider"
                  style={{ fontFamily: FONTS.sansSemi }}
                >
                  AI Summary
                </Animated.Text>
                <Animated.Text className="text-sm text-text-base leading-relaxed" style={{ fontFamily: FONTS.sans }}>
                  {memory.summary}
                </Animated.Text>
              </View>
            )}

            {/* Tags */}
            {(memory.tags?.length ?? 0) > 0 && (
              <View className="gap-2">
                <Animated.Text className="text-sm text-text-weak" style={{ fontFamily: FONTS.sansMedium }}>
                  Tags
                </Animated.Text>
                <View className="flex-row flex-wrap gap-2">
                  {memory.tags!.map((tag) => (
                    <MemTag key={tag} label={tag} />
                  ))}
                </View>
              </View>
            )}

            {/* Other attachments */}
            {otherAttachments.length > 0 && (
              <View className="gap-2 mt-2">
                <Animated.Text className="text-sm font-semibold text-text-muted uppercase tracking-wider" style={{ fontFamily: FONTS.sansSemi }}>
                  Attachments
                </Animated.Text>
                <View className="gap-2">
                  {otherAttachments.map((a) => (
                    <TouchableOpacity
                      key={a._id}
                      onPress={() => handleOpenFile(a.url)}
                      className="flex-row items-center justify-between bg-fill-weaker border border-stroke-weaker p-3 rounded-xl"
                    >
                      <View className="flex-row items-center gap-3 flex-1">
                        <View className="size-10 bg-white rounded-lg border border-stroke-weaker items-center justify-center">
                          <FileText size={20} color={COLORS.textBase} />
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm text-text-strong" numberOfLines={1} style={{ fontFamily: FONTS.sansMedium }}>
                            {a.name || 'Document'}
                          </Text>
                          <Text className="text-xs text-text-weak uppercase" style={{ fontFamily: FONTS.sans }}>
                            {a.type || 'FILE'} • {(a.size && Number(a.size) > 0) ? (Number(a.size) / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown size'}
                          </Text>
                        </View>
                      </View>
                      <Download size={18} color={COLORS.brand} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Action buttons */}
            <View className="flex-row gap-3 mt-4 pt-4 border-t border-stroke-weaker">
              <TouchableOpacity
                onPress={handleEdit}
                activeOpacity={0.7}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-full border border-stroke-weak bg-fill-weaker h-10"
              >
                <Pencil size={14} color={COLORS.textWeak} />
                <Animated.Text className="text-sm text-text-base" style={{ fontFamily: FONTS.sansMedium }}>
                  Edit
                </Animated.Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                disabled={deleting}
                activeOpacity={0.7}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-full border border-error-weak bg-error-weak h-10"
              >
                <Trash2 size={14} color={COLORS.error} />
                <Animated.Text className="text-sm text-error-strong" style={{ fontFamily: FONTS.sansMedium }}>
                  {deleting ? 'Deleting…' : 'Delete'}
                </Animated.Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
