import React, { useState } from 'react';
import { View, Text, ScrollView, Image, ImageBackground, TouchableOpacity, Dimensions } from 'react-native';
import { MediaPreviewModal } from '@/components/ui/MediaPreviewModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Bookmark, BookmarkCheck, MoreHorizontal, Pencil, Trash2, FileText, Download, Music } from 'lucide-react-native';
import dayjs from 'dayjs';
import Animated from 'react-native-reanimated';
import { VideoView } from 'expo-video';
import { useVideoPlayer } from '@/hooks/use-video-player';
import * as WebBrowser from 'expo-web-browser';
import { Badge, Spinner, MemTag, Skeleton } from '@/components/ui';
import { COLORS, FONTS } from '@/constants/tokens';
import { useStoryDetailLogic } from '@/hooks/use-story-detail-logic';
import { useBackHandler } from '@/hooks/use-back-handler';

const PATTERN = require('../../../assets/images/backgrounds/welcome_bg.png');

const SCREEN_W = Dimensions.get('window').width;

function VideoItem({ uri, style }: { uri: string; style?: any }) {
  const { player } = useVideoPlayer(uri, { loop: true, autoPlay: false });
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

  // Intercept Android hardware back to prevent app exit when history is empty
  useBackHandler(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/stories');
    }
  });

  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);

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
          {/* ── Image / video grid — vertical wrap, tap to full-screen preview ── */}
          {imageAttachments.length > 0 && (() => {
            const imgOnly = imageAttachments.filter(a => !a.type?.startsWith('video/'));
            const videos  = imageAttachments.filter(a =>  a.type?.startsWith('video/'));
            return (
              <View style={{ gap: 4, padding: 4 }}>
                {/* Image grid — 3-column wrap */}
                {imgOnly.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                    {imgOnly.map((item, idx) => {
                      const globalIdx = imageAttachments.findIndex(a => a.url === item.url);
                      const isSingle = imgOnly.length === 1;
                      return (
                        <TouchableOpacity
                          key={item.url ?? idx}
                          activeOpacity={0.85}
                          onPress={() => {
                            setPreviewIndex(globalIdx >= 0 ? globalIdx : idx);
                            setPreviewVisible(true);
                          }}
                          style={{
                            width: isSingle ? '100%' : '31.5%',
                            aspectRatio: isSingle ? 16 / 9 : 1,
                            borderRadius: 12,
                            overflow: 'hidden',
                            backgroundColor: COLORS.fillWeak,
                          }}
                        >
                          <Image
                            source={{ uri: item.url }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
                {/* Videos — full-width, stacked */}
                {videos.map((item, idx) => (
                  <View key={item.url ?? idx} style={{ borderRadius: 12, overflow: 'hidden', marginTop: imgOnly.length ? 4 : 0 }}>
                    <VideoItem uri={item.url || ''} style={{ width: '100%', aspectRatio: 16 / 9 }} />
                  </View>
                ))}
              </View>
            );
          })()}

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

            {/* AI Summary — hidden until quality improves (generic copy, no personalisation).
                Re-enable once the backend prompt uses the user's name and context.
                Ticket: https://github.com/mementoAI-git/mobile/issues/XX */}

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

            {/* Other attachments — type-specific cards */}
            {otherAttachments.length > 0 && (
              <View className="gap-2 mt-2">
                <Animated.Text className="text-sm font-semibold text-text-muted uppercase tracking-wider" style={{ fontFamily: FONTS.sansSemi }}>
                  Attachments
                </Animated.Text>
                <View className="gap-2">
                  {otherAttachments.map((a) => {
                    const isVoice = a.name?.startsWith('voice_') || false;
                    const isAudio = a.type?.startsWith('audio/');

                    // ── Voice note card ──────────────────────────────────────
                    if (isVoice) {
                      // Seeded waveform bars from clientId/name
                      let h = 0;
                      const seed = a._id || a.name || '';
                      for (let i = 0; i < seed.length; i++) {
                        h = (h * 31 + seed.charCodeAt(i)) | 0;
                      }
                      const bars = Array.from({ length: 24 }, (_, i) =>
                        4 + Math.round((Math.sin((Math.abs(h) + i * 997) * 0.013) * 0.5 + 0.5) * 16)
                      );
                      const dur = Number(a.duration ?? 0);
                      const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
                      return (
                        <View key={a._id} style={{ backgroundColor: COLORS.textStrong, borderRadius: 16, padding: 14, paddingRight: 36, position: 'relative' }}>
                          <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 12, color: 'rgba(255,255,255,0.85)', marginBottom: 10 }} numberOfLines={1}>
                            Voice note{dur > 0 ? ` · ${fmt(dur)}` : ''}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
                            {bars.map((barH, i) => (
                              <View
                                key={i}
                                style={{ flex: 1, height: barH, borderRadius: 2, backgroundColor: `${COLORS.brand}99`, maxHeight: 24 }}
                              />
                            ))}
                          </View>
                        </View>
                      );
                    }

                    // ── Audio file card ──────────────────────────────────────
                    if (isAudio) {
                      return (
                        <TouchableOpacity
                          key={a._id}
                          onPress={() => handleOpenFile(a.url)}
                          activeOpacity={0.7}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.fillWeak, borderRadius: 12, borderWidth: 1, borderColor: COLORS.strokeWeaker, paddingHorizontal: 12, paddingVertical: 10 }}
                        >
                          <Music size={18} color={COLORS.brand} strokeWidth={1.8} />
                          <Text style={{ flex: 1, fontFamily: FONTS.sansMedium, fontSize: 13, color: COLORS.textStrong }} numberOfLines={1}>
                            {a.name || 'Audio file'}
                          </Text>
                          <Download size={16} color={COLORS.brand} />
                        </TouchableOpacity>
                      );
                    }

                    // ── Document / generic file card ─────────────────────────
                    return (
                      <TouchableOpacity
                        key={a._id}
                        onPress={() => handleOpenFile(a.url)}
                        activeOpacity={0.7}
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
                              {a.type?.split('/')[1]?.toUpperCase() ?? 'FILE'}{(a.size && Number(a.size) > 0) ? ` · ${(Number(a.size) / 1024 / 1024).toFixed(2)} MB` : ''}
                            </Text>
                          </View>
                        </View>
                        <Download size={18} color={COLORS.brand} />
                      </TouchableOpacity>
                    );
                  })}
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

      {/* Full-screen image previewer */}
      <MediaPreviewModal
        visible={previewVisible}
        attachments={imageAttachments.map(a => ({
          clientId: a._id ?? (a.url ?? ''),
          uri: a.url ?? '',
          name: a.name ?? '',
          mimeType: a.type ?? 'image/jpeg',
        }))}
        initialIndex={previewIndex}
        onClose={() => setPreviewVisible(false)}
      />
    </SafeAreaView>
  );
}
