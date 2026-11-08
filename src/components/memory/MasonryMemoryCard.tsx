import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { useCallback, useMemo, useEffect } from 'react';

import { View, Text, Image, ImageBackground, ActivityIndicator } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import MoreHorizontal from 'lucide-react-native/icons/ellipsis';
import Play from 'lucide-react-native/icons/play';
import Pause from 'lucide-react-native/icons/pause';
import { VideoThumbnail } from '@/components/ui/VideoThumbnail';
import { SignedAttachmentImage } from '@/components/ui/SignedAttachmentImage';
import { useUiStore, useFeedAudioPlaybackStore } from '@/store';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import type { IMemory } from '@/types';
import { getMediaCategory } from '@/features/media/media-type';
import { runtimeDiagnostics, sanitizeMediaUri } from '@/lib/runtime-diagnostics';
import { canRenderAttachmentUri } from '@/features/media/media-runtime-policy';

const RECORD_BANNER = require('../../../assets/images/backgrounds/record-banner.png');

/** Small spinner shown while quick capture enrichment is pending */
function InProgressBadge({ memory, overlay }: { memory: IMemory; overlay?: boolean }) {
  const COLORS = useThemeColors();
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
      <Text style={{ ...TYPE.metadata, color: '#fff' }}>1/{total}</Text>
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

function AnimatedCardWaveBar({
  baseHeight,
  isPlaying,
  color,
}: {
  baseHeight: number;
  isPlaying: boolean;
  color: string;
}) {
  const scaleY = useSharedValue(1);

  useEffect(() => {
    if (isPlaying) {
      const duration = 280 + Math.random() * 260;
      scaleY.value = withRepeat(
        withSequence(
          withTiming(0.25 + Math.random() * 0.85, { duration }),
          withTiming(1, { duration })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(scaleY);
      scaleY.value = withTiming(1, { duration: 200 });
    }
  }, [isPlaying, scaleY]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: scaleY.value }],
  }));

  return (
    <Animated.View
      style={[
        { width: 2.5, height: baseHeight, backgroundColor: color, borderRadius: 2 },
        animStyle,
      ]}
    />
  );
}

function formatAudioSeconds(secs: number) {
  const total = Math.max(0, Math.floor(secs));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function MasonryAudioCardVisual({
  memory,
  audioMedia,
  aspectRatio,
  handleActions,
}: {
  memory: IMemory;
  audioMedia: any;
  aspectRatio: number;
  handleActions: () => void;
}) {
  const COLORS = useThemeColors();
  const isPlaying = useFeedAudioPlaybackStore(
    (s) => s.activeMemoryId === memory._id && s.isPlaying
  );
  const currentTime = useFeedAudioPlaybackStore(
    (s) => (s.activeMemoryId === memory._id ? s.currentTime : 0)
  );
  const storeDuration = useFeedAudioPlaybackStore(
    (s) => (s.activeMemoryId === memory._id ? s.duration : 0)
  );

  const isVoiceRecording =
    audioMedia.name?.startsWith('voice_') && audioMedia.type === 'audio/m4a';
  const albumArt = audioMedia.thumbnail;
  const rawFileName = audioMedia.name
    ? audioMedia.name.replace(/\.[^.]+$/, '').replace(/_\d{12,}$/, '').replace(/_/g, ' ')
    : 'Audio';
  const fileName = memory.title && memory.title !== 'Untitled Memory' ? memory.title : rawFileName;

  const totalSecs = storeDuration > 0 ? storeDuration : (audioMedia.duration || 0);
  const displayDuration = isPlaying
    ? `${formatAudioSeconds(currentTime)} / ${formatAudioSeconds(totalSecs)}`
    : totalSecs > 0
    ? formatAudioSeconds(totalSecs)
    : '0:00';

  const handleTogglePlay = useCallback(
    (e: any) => {
      e?.stopPropagation?.();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (audioMedia?.url) {
        useFeedAudioPlaybackStore.getState().togglePlay(memory._id, audioMedia.url);
      }
    },
    [audioMedia?.url, memory._id]
  );

  if (albumArt) {
    return (
      <View style={{ aspectRatio }} className="w-full rounded-[14px] overflow-hidden relative">
        <Image source={{ uri: albumArt }} className="w-full h-full" resizeMode="cover" />
        <InProgressBadge memory={memory} overlay />
        <View
          className="absolute bottom-0 left-0 right-0 px-3 py-2.5 flex-row items-center gap-2.5"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
        >
          <TouchableOpacity
            onPress={handleTogglePlay}
            hitSlop={8}
            activeOpacity={0.8}
            className="size-7 rounded-full bg-brand items-center justify-center"
          >
            {isPlaying ? (
              <Pause size={12} color={COLORS.textInverse} fill={COLORS.textInverse} />
            ) : (
              <Play size={12} color={COLORS.textInverse} fill={COLORS.textInverse} style={{ marginLeft: 1 }} />
            )}
          </TouchableOpacity>
          <View className="flex-row items-end gap-0.5" style={{ height: 16 }}>
            {[5, 10, 14, 11, 7, 12, 8, 14, 10, 5].map((h, i) => (
              <AnimatedCardWaveBar key={i} baseHeight={h} isPlaying={isPlaying} color={COLORS.brand} />
            ))}
          </View>
          <Text style={{ ...TYPE.metadata, color: COLORS.textInverse, flex: 1 }} numberOfLines={1}>
            {fileName}
          </Text>
          <Text style={{ ...TYPE.metadata, color: 'rgba(255,255,255,0.75)' }}>
            {displayDuration}
          </Text>
        </View>
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

  if (isVoiceRecording) {
    return (
      <View style={{ aspectRatio }} className="w-full rounded-[14px] overflow-hidden relative">
        <ImageBackground source={RECORD_BANNER} className="absolute inset-0" resizeMode="cover" style={{ opacity: 0.9 }} />
        <InProgressBadge memory={memory} overlay />
        <View className="absolute inset-0 items-center justify-center px-4">
          <View
            className="items-center gap-2.5 rounded-[14px] px-5 py-4 w-full"
            style={{ backgroundColor: `${COLORS.textInverse}1a`, borderWidth: 1, borderColor: `${COLORS.textInverse}33` }}
          >
            <TouchableOpacity
              onPress={handleTogglePlay}
              hitSlop={8}
              activeOpacity={0.8}
              className="size-11 rounded-full bg-brand items-center justify-center shadow-md"
            >
              {isPlaying ? (
                <Pause size={18} color={COLORS.textInverse} fill={COLORS.textInverse} />
              ) : (
                <Play size={18} color={COLORS.textInverse} fill={COLORS.textInverse} style={{ marginLeft: 2 }} />
              )}
            </TouchableOpacity>
            <View className="flex-row items-end gap-0.5" style={{ height: 20 }}>
              {[6, 12, 18, 14, 8, 16, 10, 18, 12, 6].map((h, i) => (
                <AnimatedCardWaveBar key={i} baseHeight={h} isPlaying={isPlaying} color={COLORS.textInverse} />
              ))}
            </View>
            <Text style={{ ...TYPE.metadata, color: COLORS.textInverse }} className="tracking-widest">
              {displayDuration}
            </Text>
          </View>
        </View>
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
    <View
      style={{ aspectRatio, backgroundColor: COLORS.fillWeak }}
      className="w-full rounded-[14px] overflow-hidden relative p-5"
    >
      <InProgressBadge memory={memory} overlay />
      <View className="flex-1 items-center justify-center gap-3">
        <TouchableOpacity
          onPress={handleTogglePlay}
          hitSlop={8}
          activeOpacity={0.8}
          className="size-11 rounded-full bg-brand items-center justify-center shadow-sm"
        >
          {isPlaying ? (
            <Pause size={18} color={COLORS.textInverse} fill={COLORS.textInverse} />
          ) : (
            <Play size={18} color={COLORS.textInverse} fill={COLORS.textInverse} style={{ marginLeft: 2 }} />
          )}
        </TouchableOpacity>
        <View className="flex-row items-end gap-1" style={{ height: 28 }}>
          {[8, 16, 24, 20, 12, 22, 14, 24, 18, 8, 16, 24].map((h, i) => (
            <AnimatedCardWaveBar key={i} baseHeight={h} isPlaying={isPlaying} color={COLORS.brand} />
          ))}
        </View>
        <Text
          style={{ ...TYPE.metadata, color: COLORS.textStrong, textAlign: 'center' }}
          numberOfLines={2}
        >
          {fileName}
        </Text>
        <View className="bg-card-overlay rounded-full px-3 py-1">
          <Text style={{ ...TYPE.metadata, color: COLORS.textBase }}>
            {displayDuration}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={handleActions}
        hitSlop={8}
        className="absolute top-2 right-2 size-7 rounded-full bg-fill-weak items-center justify-center"
      >
        <MoreHorizontal size={12} color={COLORS.textBase} />
      </TouchableOpacity>
    </View>
  );
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
  const COLORS = useThemeColors();
  // Default press: navigate to detail. Stable regardless of whether onPress is provided.
  const handlePress = useCallback(() => {
    Haptics.selectionAsync();
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
          <View style={{ aspectRatio }} className="w-full rounded-[14px] overflow-hidden relative">
            <VideoThumbnail
              uri={bannerMedia.url}
              attachment={bannerMedia}
              context={{ memory_id: memory._id }}
              thumbnailUrl={bannerMedia.thumbnail}
              borderRadius={14}
              onPress={handleVideoPress}
            />
            <InProgressBadge memory={memory} overlay />
            <AttachmentCount memory={memory} />
            <TouchableOpacity
              onPress={handleActions}
              hitSlop={8}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Options for ${storyTitle}`}
              className="absolute top-2 right-2 size-8 rounded-full bg-white/20 items-center justify-center"
            >
              <MoreHorizontal size={14} color={COLORS.textInverse} />
            </TouchableOpacity>
          </View>
        );
      }
      return (
        <View style={{ aspectRatio }} className="w-full rounded-[14px] overflow-hidden bg-fill-weaker relative">
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
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Options for ${storyTitle}`}
            className="absolute top-2 right-2 size-8 rounded-full bg-card-overlay items-center justify-center shadow-sm"
          >
            <MoreHorizontal size={14} color={COLORS.textBase} />
          </TouchableOpacity>
        </View>
      );
    }

    // ── Audio card — only show when body has no actual text content ───────────
    if (audioMedia && !bodyText) {
      return (
        <MasonryAudioCardVisual
          memory={memory}
          audioMedia={audioMedia}
          aspectRatio={aspectRatio}
          handleActions={handleActions}
        />
      );
    }

    // Text-only card
    return (
      <View
        style={{
          backgroundColor: COLORS.fillWeak,
          minHeight: textCardMinHeight,
        }}
        className="w-full rounded-[14px] p-4 gap-3 relative overflow-hidden"
      >
        <View className='flex-row'>
          <InProgressBadge memory={memory} />
        </View>
        {bodyText ? (
          <Text
            className="text-text-base leading-relaxed"
            style={TYPE.bodySmall}
            numberOfLines={textBodyLines}
          >
            {bodyText}
          </Text>
        ) : null}
        <TouchableOpacity
          onPress={handleActions}
          hitSlop={8}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Options for ${storyTitle}`}
          className="absolute top-2 right-2 size-7 rounded-full items-center justify-center"
          style={{ backgroundColor: COLORS.fillWeak }}
        >
          <MoreHorizontal size={12} color={COLORS.textWeak} />
        </TouchableOpacity>
      </View>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [COLORS, bannerMedia, audioMedia, bodyText, aspectRatio, textCardMinHeight, textBodyLines, memory, handleActions, handleVideoPress]);


  if (variant === 'list') {
    const hasMedia = !!(bannerMedia || audioMedia);
    return (
      <Animated.View
        style={[animStyle]}
        className="w-full mb-2 bg-card rounded-[14px] overflow-hidden border border-stroke-weak"
      >
        <TouchableOpacity
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.95}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Memory: ${storyTitle}`}
        >
          {hasMedia && (
            <View className="overflow-hidden rounded-t-[14px]">
              {visual}
            </View>
          )}
          <View className="px-5 pt-4 pb-5 gap-3">
            {!hasMedia && <InProgressBadge memory={memory} />}
            <Text
              className="text-text-strong"
              style={TYPE.cardTitle}
              numberOfLines={2}
            >
              {storyTitle}
            </Text>
            {bodyText ? (
              <Text
                className="leading-relaxed"
                style={{ ...TYPE.body, color: COLORS.previewText }}
                numberOfLines={2}
              >
                {bodyText}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleActions}
          hitSlop={8}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Options for ${storyTitle}`}
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
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Memory: ${storyTitle}`}
      >
        {visual}

        {/* Title below the card (Pinterest-style) */}
        <Text
          className="mt-2 px-0.5 text-center text-text-strong leading-snug"
          style={TYPE.bodySmall}
          numberOfLines={2}
        >
          {storyTitle}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});
