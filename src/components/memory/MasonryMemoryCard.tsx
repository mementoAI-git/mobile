import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { useCallback, useMemo, useEffect, useState } from 'react';

import { View, Text, Image, ActivityIndicator } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
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
import { MediaPreviewModal, type PreviewAttachment } from '@/components/ui/MediaPreviewModal';
import { SignedAttachmentImage } from '@/components/ui/SignedAttachmentImage';
import { isCallRecordingAttachment } from '@/features/memories/call-recording-story';
import { useUiStore, useFeedAudioPlaybackStore } from '@/store';
import { COLORS } from '@/constants/tokens';
import { recordingWaveformColor } from '@/features/media/recording-waveform';
import { TYPE } from '@/constants/typography';
import type { IMemory } from '@/types';
import { getMediaCategory } from '@/features/media/media-type';
import { runtimeDiagnostics, sanitizeMediaUri } from '@/lib/runtime-diagnostics';
import { canRenderAttachmentUri } from '@/features/media/media-runtime-policy';


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
  width = 2.5,
}: {
  baseHeight: number;
  isPlaying: boolean;
  color: string;
  width?: number;
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
        { width, height: baseHeight, backgroundColor: color, borderRadius: width / 2 },
        animStyle,
      ]}
    />
  );
}

function decodeEntities(text: string) {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&');
}

function formatAudioSeconds(secs: number) {
  const total = Math.max(0, Math.floor(secs));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/** Designer waveform for voice recording cards: bar heights in px, centred on one line. */
const VOICE_WAVEFORM = [12.99, 12.99, 20.41, 24.12, 20.41, 31.54, 20.41, 12.99, 24.12, 20.41, 8.04] as const;
const VOICE_CARD_SIZE = { width: 174.5, height: 237 } as const;

/** 00:32:24 — hours, minutes and seconds, as in the recording card design. */
function formatRecordingClock(secs: number) {
  const total = Math.max(0, Math.floor(secs));
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

/** Voice recording story card: weak fill, two faint rings, a white waveform and the time in a chip. */
function VoiceRecordingCardVisual({ memory, seconds, aspectRatio, onOpenPlayer, onActions }: {
  memory: IMemory;
  seconds: number;
  /** The grid's seeded masonry ratio, so recordings vary in height like other cards. */
  aspectRatio: number;
  onOpenPlayer: () => void;
  onActions: () => void;
}) {
  const colors = useThemeColors();
  const waveformColor = recordingWaveformColor(colors);
  const clock = formatRecordingClock(seconds);
  return (
    <View
      style={{
        aspectRatio,
        backgroundColor: colors.fillWeak,
        overflow: 'hidden',
      }}
      // Same shape as the other grid cards: 14px corners, no border.
      className="w-full rounded-[14px] relative"
    >
      <Svg
        pointerEvents="none"
        width="100%"
        height="100%"
        viewBox={`0 0 ${VOICE_CARD_SIZE.width} ${VOICE_CARD_SIZE.height}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute' }}
      >
        <Circle cx={229.787} cy={250.518} r={134.787} stroke={colors.strokeWeak} fill="none" />
        <Circle cx={30.084} cy={142.631} r={153.869} stroke={colors.strokeWeak} fill="none" />
      </Svg>
      <InProgressBadge memory={memory} overlay />
      <TouchableOpacity
        onPress={onOpenPlayer}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Open recording, ${clock}`}
        className="absolute inset-0 items-center justify-center"
        style={{ gap: 12 }}
      >
        <View className="flex-row items-center" style={{ height: 32, gap: 3.62 }}>
          {VOICE_WAVEFORM.map((h, i) => (
            <View key={i} style={{ width: 2.17, height: h, borderRadius: 1.085, backgroundColor: waveformColor }} />
          ))}
        </View>
        <View style={{ height: 22, minWidth: 58, paddingHorizontal: 8, borderRadius: 11, backgroundColor: colors.strokeWeak, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ ...TYPE.metadata, color: colors.textStrong, fontVariant: ['tabular-nums'] }}>{clock}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onActions}
        hitSlop={8}
        accessibilityLabel="Story options"
        className="absolute top-2 right-2 size-7 rounded-full bg-fill-weak items-center justify-center"
      >
        <MoreHorizontal size={12} color={colors.textBase} />
      </TouchableOpacity>
    </View>
  );
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

  const [playerOpen, setPlayerOpen] = useState(false);
  const handleOpenPlayer = useCallback(() => {
    void Haptics.selectionAsync();
    // The player owns playback; stop any card that is playing in the feed.
    useFeedAudioPlaybackStore.getState().stop();
    setPlayerOpen(true);
  }, []);
  const handleClosePlayer = useCallback(() => setPlayerOpen(false), []);
  const playerAttachments = useMemo<PreviewAttachment[]>(() => [{
    clientId: audioMedia._id ?? audioMedia.url ?? memory._id,
    uri: audioMedia.url ?? '',
    name: fileName,
    mimeType: audioMedia.type ?? 'audio/m4a',
    duration: audioMedia.duration,
    isVoice: audioMedia.name?.startsWith('voice_') && audioMedia.type === 'audio/m4a',
    thumbnailUrl: audioMedia.thumbnail ?? null,
    persistedFileId: audioMedia._id,
    access: audioMedia.access,
  }], [audioMedia, fileName, memory._id]);

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

  // Every recording without cover art uses the designed recording card. Tapping it opens
  // the full audio player (transcript, timeline, controls) rather than playing in the grid.
  return (
    <>
      <VoiceRecordingCardVisual
        memory={memory}
        seconds={totalSecs}
        aspectRatio={aspectRatio}
        onOpenPlayer={handleOpenPlayer}
        onActions={handleActions}
      />
      {playerOpen ? (
        <MediaPreviewModal
          visible
          attachments={playerAttachments}
          memoryId={memory._id}
          onClose={handleClosePlayer}
        />
      ) : null}
    </>
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

  // Strip HTML once — reused across all render branches. Entities are decoded
  // so transcripts read "It's", not "It&#39;s".
  const bodyText = useMemo(
    () => decodeEntities(memory.body?.replace(/<[^>]+>/g, '') ?? '').trim(),
    [memory.body],
  );
  // Recorded conversations look like recordings: the audio card, not the transcript.
  const isCallRecording = isCallRecordingAttachment(audioMedia);

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

    // ── Audio card — recordings (no text) and recorded conversations ──────────
    if (audioMedia && (!bodyText || isCallRecording)) {
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
  }, [COLORS, bannerMedia, audioMedia, bodyText, isCallRecording, aspectRatio, textCardMinHeight, textBodyLines, memory, handleActions, handleVideoPress]);


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
