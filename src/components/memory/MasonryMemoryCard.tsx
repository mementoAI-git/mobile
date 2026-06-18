import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, ImageBackground, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { MoreHorizontal } from 'lucide-react-native';
import { VideoThumbnail } from '@/components/ui/VideoThumbnail';
import { useUiStore } from '@/store';
import { COLORS, FONTS, CARD_PASTEL_SURFACES } from '@/constants/tokens';
import type { IMemory } from '@/types';
import dayjs from 'dayjs';

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
  const handlePress = onPress ?? (() => router.push(`/(tabs)/stories/${memory._id}`));

  const seed = stableHash(memory._id || memory.title || '');
  // List mode uses 3:2; grid mode uses seeded ratio
  const aspectRatio = variant === 'list' ? 3 / 2 : MEDIA_ASPECT_RATIOS[seed % MEDIA_ASPECT_RATIOS.length];
  const surface = CARD_PASTEL_SURFACES[seed % CARD_PASTEL_SURFACES.length];

  // Prefer an image attachment for the thumbnail — videos render as blank when
  // used as <Image> source. Fall back to the first video if no images exist.
  const bannerMedia =
    memory.attachments?.find((a) => a.type?.startsWith('image/')) ??
    memory.attachments?.find((a) => a.type?.startsWith('video/'));
  const audioMedia = memory.attachments?.find((a) => a.type?.startsWith('audio/'));

  const cardScale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }));

  const handlePressIn = useCallback(() => { cardScale.value = withSpring(0.97); }, [cardScale]);
  const handlePressOut = useCallback(() => { cardScale.value = withSpring(1); }, [cardScale]);

  const handleActions = useCallback(() => {
    Haptics.selectionAsync();
    useUiStore.getState().openSheet('memory-actions', { memory });
  }, [memory]);

  const storyTitle = memory.title || 'Untitled Memory';
  const hasTopics = Array.isArray(memory.topics) && memory.topics.length > 0;
  const textCardMinHeight = TEXT_CARD_MIN_HEIGHTS[seed % TEXT_CARD_MIN_HEIGHTS.length];
  const textBodyLines = TEXT_BODY_CLAMPS[seed % TEXT_BODY_CLAMPS.length];

  // ── Render the visual block ───────────────────────────────────────────────

  const renderVisual = () => {
    if (bannerMedia) {
      const isVideo = bannerMedia.type?.startsWith('video/');
      if (isVideo && bannerMedia.url) {
        return (
          <View style={{ aspectRatio }} className="w-full rounded-[20px] overflow-hidden relative">
            {/* VideoThumbnail extracts first frame via expo-video-thumbnails.
                onPress navigates to the story detail page. */}
            <VideoThumbnail
              uri={bannerMedia.url}
              borderRadius={20}
              onPress={() => { Haptics.selectionAsync(); handlePress(); }}
            />
            {/* In progress badge / attachment count — overlay top-left */}
            <InProgressBadge memory={memory} overlay />
            <AttachmentCount memory={memory} />
            {/* Actions button */}
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
          <Image
            key={bannerMedia.url}
            source={{ uri: bannerMedia.url }}
            className="w-full h-full"
            resizeMode="cover"
          />
          {/* In progress badge / attachment count — overlay top-left */}
          <InProgressBadge memory={memory} overlay />
          <AttachmentCount memory={memory} />
          {/* Actions button */}
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
    // Strip HTML tags first (story editor wraps content in <p> tags even when empty)
    const bodyText = memory.body?.replace(/<[^>]+>/g, '').trim() ?? '';
    if (audioMedia && !bodyText) {
      const isVoiceRecording =
        audioMedia.name?.startsWith('voice_') && audioMedia.type === 'audio/m4a';

      // Album art: populated by backend when MP3 has embedded ID3 cover art.
      // Currently always undefined — see TODO.md for backend implementation spec.
      const albumArt = audioMedia.thumbnail;

      const duration = audioMedia.duration
        ? dayjs().startOf('day').add(audioMedia.duration, 'second').format('HH:mm:ss')
        : '00:00:00';

      const rawFileName = audioMedia.name
        ? audioMedia.name.replace(/\.[^.]+$/, '').replace(/_\d{12,}$/, '').replace(/_/g, ' ')
        : 'Audio';
      // Prefer the AI-generated memory title (transcription-based) over the raw filename
      const fileName = memory.title && memory.title !== 'Untitled Memory' ? memory.title : rawFileName;

      // ── Case 1: MP3 with embedded album art ────────────────────────────────
      if (albumArt) {
        return (
          <View style={{ aspectRatio }} className="w-full rounded-[20px] overflow-hidden relative">
            <Image source={{ uri: albumArt }} className="w-full h-full" resizeMode="cover" />
            <InProgressBadge memory={memory} overlay />
            {/* Glass overlay with waveform + duration at bottom */}
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

      // ── Case 2: Voice recording (voice_*.m4a) — dark record-banner ─────────
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

      // ── Case 3: Uploaded audio file (MP3, WAV, AAC etc) — clean music card ─
      return (
        <View
          style={{ aspectRatio, backgroundColor: COLORS.fillWeak }}
          className="w-full rounded-[20px] overflow-hidden relative p-5"
        >
          <InProgressBadge memory={memory} overlay />
          <View className="flex-1 items-center justify-center gap-3">
            {/* Orange waveform bars */}
            <View className="flex-row items-end gap-1" style={{ height: 32 }}>
              {[8, 16, 24, 20, 12, 22, 14, 24, 18, 8, 16, 24].map((h, i) => (
                <View key={i} style={{ width: 3, height: h, backgroundColor: COLORS.brand, borderRadius: 2 }} />
              ))}
            </View>
            {/* Filename */}
            <Text
              style={{ fontFamily: FONTS.sansSemi, fontSize: 12, color: COLORS.textStrong, textAlign: 'center' }}
              numberOfLines={2}
            >
              {fileName}
            </Text>
            {/* Duration pill */}
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
    // Audio + text body → falls through to text card below

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
        {/* In progress badge — inline for text cards */}
        <View className='flex-row'>
          {/* <Text
            className="text-[15px] text-text-strong leading-snug font-semibold"
            style={{ fontFamily: FONTS.sansSemi }}
            numberOfLines={3}
          >
            {storyTitle}
          </Text> */}
          <InProgressBadge memory={memory} />
        </View>

        {/* User's own body text only — seeded line clamp */}
        {memory.body ? (
          <Text
            className="text-xs text-text-weak leading-relaxed"
            style={{ fontFamily: FONTS.sans }}
            numberOfLines={textBodyLines}
          >
            {memory.body.replace(/<[^>]+>/g, '').trim()}
          </Text>
        ) : null}

        {/* User-defined tags — shown on text cards (matches web) */}
        {(memory.tags?.length ?? 0) > 0 && (
          <View className="flex-row flex-wrap gap-1 mt-0.5">
            {memory.tags!.slice(0, 4).map((tag) => (
              <View
                key={tag}
                className="rounded-full px-2 py-0.5"
                style={{ backgroundColor: `${surface.border}99`, borderWidth: 1, borderColor: surface.border }}
              >
                <Text style={{ fontFamily: FONTS.sans, fontSize: 10, color: COLORS.textWeak }}>
                  #{tag}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Actions button */}
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
  };

  if (variant === 'list') {
    const hasMedia = !!(bannerMedia || audioMedia);
    return (
      <Animated.View
        style={[animStyle]}
        // border-stroke-weak (not weaker) gives a crisper card edge against the cream background
        className="w-full mb-2 bg-white rounded-[24px] overflow-hidden border border-stroke-weak"
      >
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); handlePress(); }}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.95}
        >
          {/* Hero media block — only rendered when the memory actually has media.
              Text-only memories skip this entirely so there's no empty space. */}
          {hasMedia && (
            <View className="overflow-hidden rounded-t-[24px]">
              {renderVisual()}
            </View>
          )}

          {/* Body */}
          <View className="px-5 pt-4 pb-5 gap-3">
            {/* InProgress badge for text-only cards (media cards show it as overlay) */}
            {!hasMedia && <InProgressBadge memory={memory} />}

            {/* Title */}
            <Text
              className="text-[22px] text-text-strong leading-tight"
              style={{ fontFamily: FONTS.serif }}
              numberOfLines={2}
            >
              {storyTitle}
            </Text>

            {/* Body preview — max 2 lines */}
            {memory.body ? (
              <Text
                className="text-sm leading-relaxed"
                style={{ fontFamily: FONTS.sans, color: '#555555' }}
                numberOfLines={2}
              >
                {memory.body.replace(/<[^>]+>/g, '').trim()}
              </Text>
            ) : null}

            {/* Tags */}
            {(memory.tags?.length ?? 0) > 0 && (
              <View className="flex-row flex-wrap gap-1.5">
                {memory.tags!.slice(0, 4).map((tag) => (
                  <View
                    key={tag}
                    className="rounded-full px-2.5 py-0.5"
                    style={{ backgroundColor: `${surface.border}99`, borderWidth: 1, borderColor: surface.border }}
                  >
                    <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: COLORS.textWeak }}>
                      #{tag}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Actions button — absolute, so it floats above content for text-only cards too */}
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
        onPress={() => {
          Haptics.selectionAsync();
          handlePress();
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.95}
      >
        {renderVisual()}

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
