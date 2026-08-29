import React, { useCallback, useMemo } from 'react';

import { View, Text, TouchableOpacity, Image, ImageBackground, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { MoreHorizontal } from 'lucide-react-native';
import { VideoThumbnail } from '@/components/ui/VideoThumbnail';
import { SignedAttachmentImage } from '@/components/ui/SignedAttachmentImage';
import { useUiStore } from '@/store';
import { COLORS, FONTS, CARD_PASTEL_SURFACES } from '@/constants/tokens';
import type { IMemory } from '@/types';
import dayjs from 'dayjs';
import { getMediaCategory } from '@/features/media/media-type';
import { runtimeDiagnostics, sanitizeMediaUri } from '@/lib/runtime-diagnostics';
import { canRenderAttachmentUri } from '@/features/media/media-runtime-policy';

const RECORD_BANNER = require('../../../assets/images/backgrounds/record-banner.png');

/** Small spinner shown while quick capture enrichment is pending */
function InProgressBadge({ memory, overlay }: { memory: IMemory; overlay?: boolean }) {
  const isPending =
    memory.enrichment_status === 'pending' &&
    (memory.capture_source === 'quick' ||
      memory.prompt_type === 'static' ||
      memory.prompt_type === 'ai-generated');
  if (!isPending) return null;
  return (
    <View
      style={overlay ? { position: 'absolute', top: 8, left: 8, zIndex: 10 } : { alignSelf: 'flex-start' }}
    >
      <ActivityIndicator size="small" color={COLORS.brand} />
    </View>
  );
}

/** 1/N attachment counter pill — top-left overlay when story has multiple attachments */
function AttachmentCount({ memory }: { memory: IMemory }) {
  const total = memory.attachments?.length ?? 0;
  if (total <= 1) return null;
  return (
    <View style={{ position: 'absolute', top: 8, left: 8, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ fontFamily: FONTS.sansBold, fontSize: 12, color: '#fff' }}>1/{total}</Text>
    </View>
  );
}

// ─── Seeding helpers (mirrors web grid.tsx) ──────────────────────────────────

const MEDIA_ASPECT_RATIOS = [4 / 5, 5 / 6, 3 / 4, 1] as const;
/** Seeded min-heights for text cards — mirrors web TEXT_CARD_MIN_HEIGHTS */
const TEXT_CARD_MIN_HEIGHTS = [206, 232, 264] as const;
/** Seeded body line clamps — mirrors web TEXT_BODY_CLAMPS */
const TEXT_BODY_CLAMPS = [5, 7, 9] as const;

function stableHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = s.charCodeAt(i) + ((h << 5) - h);
  }
  return Math.abs(h);
}

function pickBySeed<T>(items: readonly T[], seed: number): T {
  return items[seed % items.length];
}


// ─── Component ───────────────────────────────────────────────────────────────

interface MasonryMemoryCardProps {
  memory: IMemory;
  onPress?: () => void;
  /** 'grid' = masonry column card (default), 'list' = full-width editorial card */
  variant?: 'grid' | 'list';
}

export const MasonryMemoryCard = React.memo(function MasonryMemoryCard({
  memory,
  onPress,
  variant = 'grid',
}: MasonryMemoryCardProps) {
  // Default press: navigate to detail. Stable regardless of whether onPress is provided.
  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/(tabs)/stories/${memory._id}`);
    }
  }, [onPress, memory._id]);

  const handleVideoPress = useCallback(() => {
    Haptics.selectionAsync();
    handlePress();
  }, [handlePress]);

  // Seeded display properties — deterministic per memory._id
  const seed = stableHash(memory._id || memory.title || '');
  const aspectRatio = variant === 'list' ? 3 / 2 : MEDIA_ASPECT_RATIOS[seed % MEDIA_ASPECT_RATIOS.length];
  const surface = CARD_PASTEL_SURFACES[seed % CARD_PASTEL_SURFACES.length];
  const storyTitle = memory.title || 'Untitled Memory';
  const textCardMinHeight = TEXT_CARD_MIN_HEIGHTS[seed % TEXT_CARD_MIN_HEIGHTS.length];
  const textBodyLines = TEXT_BODY_CLAMPS[seed % TEXT_BODY_CLAMPS.length];

  // Memoized attachment lookups
  const bannerMedia = useMemo(() =>
    memory.attachments?.find((a) => canRenderAttachmentUri(a.url) && getMediaCategory({ mimeType: a.type, name: a.name, uri: a.url }) === 'image') ??
    memory.attachments?.find((a) => canRenderAttachmentUri(a.url) && getMediaCategory({ mimeType: a.type, name: a.name, uri: a.url }) === 'video'),
    [memory.attachments],
  );
  const audioMedia = useMemo(() =>
    memory.attachments?.find((a) => getMediaCategory({ mimeType: a.type, name: a.name, uri: a.url }) === 'audio'),
    [memory.attachments],
  );

  // Strip HTML once — reused across all render branches
  const bodyText = useMemo(
    () => memory.body?.replace(/<[^>]+>/g, '').trim() ?? '',
    [memory.body],
  );

  const cardScale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }));
  const handlePressIn = useCallback(() => { cardScale.value = withSpring(0.97); }, [cardScale]);
  const handlePressOut = useCallback(() => { cardScale.value = withSpring(1); }, [cardScale]);

  const handleActions = useCallback(() => {
    Haptics.selectionAsync();
    useUiStore.getState().openSheet('memory-actions', { memory });
  }, [memory]);

  // Memoized visual block — only recomputes when media/text/style inputs change
  const visual = useMemo(() => {

    if (bannerMedia) {
      const isVideo = getMediaCategory({ mimeType: bannerMedia.type, name: bannerMedia.name, uri: bannerMedia.url }) === 'video';
      if (isVideo && bannerMedia.url) {
        return (
          <View style={{ aspectRatio }} className="w-full rounded-[20px] overflow-hidden relative">
            <VideoThumbnail
              uri={bannerMedia.url}
              attachment={bannerMedia}
              context={{ memory_id: memory._id }}
              thumbnailUrl={bannerMedia.thumbnail}
              borderRadius={20}
              onPress={handleVideoPress}
            />
            <InProgressBadge memory={memory} overlay />
            <AttachmentCount memory={memory} />
            <TouchableOpacity
              onPress={handleActions}
              hitSlop={8}
              className="absolute top-2 right-2 size-8 rounded-full bg-white/20 items-center justify-center"
            >
              <MoreHorizontal size={14} color={COLORS.textInverse} />
            </TouchableOpacity>
          </View>
        );
      }
      return (
        <View style={{ aspectRatio }} className="w-full rounded-[20px] overflow-hidden bg-fill-weaker relative">
          <SignedAttachmentImage
            key={bannerMedia.url}
            attachment={bannerMedia}
            context={{ memory_id: memory._id }}
            className="w-full h-full"
            resizeMode="cover"
            onLoad={() => {
              const location = sanitizeMediaUri(bannerMedia.url);
              runtimeDiagnostics.record('media', 'story-card-image-load', {
                outcome: 'success', source: location.source, host: location.host,
              });
            }}
            onError={() => {
              const location = sanitizeMediaUri(bannerMedia.url);
              runtimeDiagnostics.record('media', 'story-card-image-load', {
                outcome: 'failure', source: location.source, host: location.host,
              });
            }}
          />
          <InProgressBadge memory={memory} overlay />
          <AttachmentCount memory={memory} />
          <TouchableOpacity
            onPress={handleActions}
            hitSlop={8}
            className="absolute top-2 right-2 size-8 rounded-full bg-white/90 items-center justify-center shadow-sm"
          >
            <MoreHorizontal size={14} color={COLORS.textBase} />
          </TouchableOpacity>
        </View>
      );
    }

    // ── Audio card — only show when body has no actual text content ───────────
    if (audioMedia && !bodyText) {
      const isVoiceRecording =
        audioMedia.name?.startsWith('voice_') && audioMedia.type === 'audio/m4a';
      const albumArt = audioMedia.thumbnail;
      const duration = audioMedia.duration
        ? dayjs().startOf('day').add(audioMedia.duration, 'second').format('HH:mm:ss')
        : '00:00:00';
      const rawFileName = audioMedia.name
        ? audioMedia.name.replace(/\.[^.]+$/, '').replace(/_\d{12,}$/, '').replace(/_/g, ' ')
        : 'Audio';
      const fileName = memory.title && memory.title !== 'Untitled Memory' ? memory.title : rawFileName;

      if (albumArt) {
        return (
          <View style={{ aspectRatio }} className="w-full rounded-[20px] overflow-hidden relative">
            <Image source={{ uri: albumArt }} className="w-full h-full" resizeMode="cover" />
            <InProgressBadge memory={memory} overlay />
            <View
              className="absolute bottom-0 left-0 right-0 px-4 py-3 flex-row items-center gap-3"
              style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
            >
              <View className="flex-row items-end gap-0.5" style={{ height: 16 }}>
                {[5, 10, 14, 11, 7, 12, 8, 14, 10, 5].map((h, i) => (
                  <View key={i} style={{ width: 2.5, height: h, backgroundColor: COLORS.brand, borderRadius: 2 }} />
                ))}
              </View>
              <Text style={{ fontFamily: FONTS.sansBold, fontSize: 11, color: COLORS.textInverse, flex: 1 }} numberOfLines={1}>
                {fileName}
              </Text>
              <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                {duration}
              </Text>
            </View>
            <TouchableOpacity onPress={handleActions} hitSlop={8} className="absolute top-2 right-2 size-8 rounded-full bg-white/20 items-center justify-center">
              <MoreHorizontal size={14} color={COLORS.textInverse} />
            </TouchableOpacity>
          </View>
        );
      }

      if (isVoiceRecording) {
        return (
          <View style={{ aspectRatio }} className="w-full rounded-[20px] overflow-hidden relative">
            <ImageBackground source={RECORD_BANNER} className="absolute inset-0" resizeMode="cover" style={{ opacity: 0.9 }} />
            <InProgressBadge memory={memory} overlay />
            <View className="absolute inset-0 items-center justify-center">
              <View
                className="items-center gap-2 rounded-[20px] px-5 py-4"
                style={{ backgroundColor: `${COLORS.textInverse}1a`, borderWidth: 1, borderColor: `${COLORS.textInverse}33` }}
              >
                <View className="flex-row items-end gap-0.5" style={{ height: 20 }}>
                  {[6, 12, 18, 14, 8, 16, 10, 18, 12, 6].map((h, i) => (
                    <View key={i} style={{ width: 3, height: h, backgroundColor: COLORS.textInverse, borderRadius: 2, opacity: 0.8 }} />
                  ))}
                </View>
                <Text style={{ fontFamily: FONTS.sansBold, color: COLORS.textInverse }} className="text-sm tracking-widest">
                  {duration}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleActions} hitSlop={8} className="absolute top-2 right-2 size-8 rounded-full bg-white/20 items-center justify-center">
              <MoreHorizontal size={14} color={COLORS.textInverse} />
            </TouchableOpacity>
          </View>
        );
      }

      return (
        <View
          style={{ aspectRatio, backgroundColor: COLORS.fillWeak }}
          className="w-full rounded-[20px] overflow-hidden relative p-5"
        >
          <InProgressBadge memory={memory} overlay />
          <View className="flex-1 items-center justify-center gap-3">
            <View className="flex-row items-end gap-1" style={{ height: 32 }}>
              {[8, 16, 24, 20, 12, 22, 14, 24, 18, 8, 16, 24].map((h, i) => (
                <View key={i} style={{ width: 3, height: h, backgroundColor: COLORS.brand, borderRadius: 2 }} />
              ))}
            </View>
            <Text
              style={{ fontFamily: FONTS.sansSemi, fontSize: 12, color: COLORS.textStrong, textAlign: 'center' }}
              numberOfLines={2}
            >
              {fileName}
            </Text>
            <View className="bg-white/80 rounded-full px-3 py-1">
              <Text style={{ fontFamily: FONTS.sansBold, fontSize: 11, color: COLORS.textBase }}>
                {duration}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleActions} hitSlop={8} className="absolute top-2 right-2 size-7 rounded-full bg-fill-weak items-center justify-center">
            <MoreHorizontal size={12} color={COLORS.textBase} />
          </TouchableOpacity>
        </View>
      );
    }

    // Text-only card
    return (
      <View
        style={{
          backgroundColor: surface.bg,
          borderColor: surface.border,
          borderWidth: 1,
          minHeight: textCardMinHeight,
        }}
        className="w-full rounded-[20px] p-4 gap-3 relative overflow-hidden"
      >
        <View className='flex-row'>
          <InProgressBadge memory={memory} />
        </View>
        {bodyText ? (
          <Text
            className="text-xs text-text-weak leading-relaxed"
            style={{ fontFamily: FONTS.sans }}
            numberOfLines={textBodyLines}
          >
            {bodyText}
          </Text>
        ) : null}
        {(memory.tags?.length ?? 0) > 0 && (
          <View className="flex-row flex-wrap gap-1 mt-0.5">
            {memory.tags!.slice(0, 4).map((tag) => (
              <View
                key={tag}
                className="rounded-full px-2 py-0.5"
                style={{ backgroundColor: `${surface.border}99`, borderWidth: 1, borderColor: surface.border }}
              >
                <Text style={{ fontFamily: FONTS.sans, fontSize: 10, color: COLORS.textWeak }}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}
        <TouchableOpacity
          onPress={handleActions}
          hitSlop={8}
          className="absolute top-2 right-2 size-7 rounded-full items-center justify-center"
          style={{ backgroundColor: `${surface.border}cc` }}
        >
          <MoreHorizontal size={12} color={COLORS.textWeak} />
        </TouchableOpacity>
      </View>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bannerMedia, audioMedia, bodyText, aspectRatio, surface, textCardMinHeight, textBodyLines, memory, handleActions, handleVideoPress]);


  if (variant === 'list') {
    const hasMedia = !!(bannerMedia || audioMedia);
    return (
      <Animated.View
        style={[animStyle]}
        className="w-full mb-2 bg-white rounded-[24px] overflow-hidden border border-stroke-weak"
      >
        <TouchableOpacity
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.95}
        >
          {hasMedia && (
            <View className="overflow-hidden rounded-t-[24px]">
              {visual}
            </View>
          )}
          <View className="px-5 pt-4 pb-5 gap-3">
            {!hasMedia && <InProgressBadge memory={memory} />}
            <Text
              className="text-[22px] text-text-strong leading-tight"
              style={{ fontFamily: FONTS.serif }}
              numberOfLines={2}
            >
              {storyTitle}
            </Text>
            {bodyText ? (
              <Text
                className="text-sm leading-relaxed"
                style={{ fontFamily: FONTS.sans, color: '#555555' }}
                numberOfLines={2}
              >
                {bodyText}
              </Text>
            ) : null}
            {(memory.tags?.length ?? 0) > 0 && (
              <View className="flex-row flex-wrap gap-1.5">
                {memory.tags!.slice(0, 4).map((tag) => (
                  <View
                    key={tag}
                    className="rounded-full px-2.5 py-0.5"
                    style={{ backgroundColor: `${surface.border}99`, borderWidth: 1, borderColor: surface.border }}
                  >
                    <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: COLORS.textWeak }}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleActions}
          hitSlop={8}
          className="absolute top-3 right-3 size-8 rounded-full bg-fill-weak border border-stroke-weaker items-center justify-center"
        >
          <MoreHorizontal size={14} color={COLORS.textBase} />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // ── Grid variant (default) ────────────────────────────────────────────────
  return (
    <Animated.View style={animStyle} className="w-full">
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.95}
      >
        {visual}

        {/* Title below the card (Pinterest-style) */}
        <Text
          className="mt-2 px-0.5 text-center text-xs text-text-strong leading-snug"
          style={{ fontFamily: FONTS.sansMedium }}
          numberOfLines={2}
        >
          {storyTitle}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});
