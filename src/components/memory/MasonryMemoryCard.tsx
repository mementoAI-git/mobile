import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, ImageBackground } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { MoreHorizontal, Play } from 'lucide-react-native';
import { useUiStore } from '@/store';
import { COLORS, FONTS, CARD_PASTEL_SURFACES } from '@/constants/tokens';
import type { IMemory } from '@/types';
import dayjs from 'dayjs';

const RECORD_BANNER = require('../../../assets/images/backgrounds/record-banner.png');

/** Mirrors web QuickCaptureProcessingBadge — shown while enrichment is pending */
function InProgressBadge({ memory, overlay }: { memory: IMemory; overlay?: boolean }) {
  const isPending =
    memory.enrichment_status === 'pending' &&
    (memory.capture_source === 'quick' ||
      memory.prompt_type === 'static' ||
      memory.prompt_type === 'ai-generated');
  if (!isPending) return null;
  return (
    <View
      className={`rounded-full px-2 py-0.5 ${overlay ? 'absolute left-2 top-2 z-10 w-fit' : ''}`}
      style={{ backgroundColor: COLORS.brandSubtle, borderWidth: 1, borderColor: COLORS.brandTint }}
    >
      <Text
        className="text-[10px] font-bold uppercase tracking-wide"
        style={{ fontFamily: FONTS.sansBold, color: COLORS.brand }}
      >
        In progress
      </Text>
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

  const bannerMedia = memory.attachments?.find(
    (a) => a.type?.startsWith('image/') || a.type?.startsWith('video/'),
  );
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
      return (
        <View style={{ aspectRatio }} className="w-full rounded-[20px] overflow-hidden bg-fill-weaker relative">
          <Image
            source={{ uri: bannerMedia.url }}
            className="w-full h-full"
            resizeMode="cover"
          />
          {/* In progress badge — overlay top-left */}
          <InProgressBadge memory={memory} overlay />
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

    if (audioMedia) {
      const duration = audioMedia.duration
        ? dayjs().startOf('day').add(audioMedia.duration, 'second').format('HH:mm:ss')
        : '00:00:00';
      return (
        <View
          style={{ aspectRatio }}
          className="w-full rounded-[20px] overflow-hidden relative"
        >
          {/* record-banner.png as full-bleed bg — mirrors web audio card */}
          <ImageBackground
            source={RECORD_BANNER}
            className="absolute inset-0"
            resizeMode="cover"
            style={{ opacity: 0.9 }}
          />
          {/* In progress badge — overlay top-left */}
          <InProgressBadge memory={memory} overlay />
          {/* Duration pill — centered, glass effect */}
          <View className="absolute inset-0 items-center justify-center">
            <View
              className="items-center gap-2 rounded-[20px] px-5 py-4"
              style={{ backgroundColor: `${COLORS.textInverse}1a`, borderWidth: 1, borderColor: `${COLORS.textInverse}33` }}
            >
              {/* Wave lines — visual parity with WaveIcon on web */}
              <View className="flex-row items-end gap-0.5" style={{ height: 20 }}>
                {[6, 12, 18, 14, 8, 16, 10, 18, 12, 6].map((h, i) => (
                  <View
                    key={i}
                    style={{ width: 3, height: h, backgroundColor: COLORS.textInverse, borderRadius: 2, opacity: 0.8 }}
                  />
                ))}
              </View>
              <Text
                className="text-sm font-semibold tracking-widest"
                style={{ fontFamily: FONTS.sansBold, color: COLORS.textInverse }}
              >
                {duration}
              </Text>
            </View>
          </View>
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
    return (
      <Animated.View
        style={[animStyle, {
          shadowColor: COLORS.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.07,
          shadowRadius: 16,
        }]}
        className="w-full mb-2 bg-white rounded-[24px] overflow-hidden border border-stroke-weaker"
      >
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); handlePress(); }}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.95}
        >
          {/* Hero — same renderVisual but rounded-t only */}
          <View className="overflow-hidden rounded-t-[24px]">
            {renderVisual()}
          </View>

          {/* Body */}
          <View className="px-5 pt-4 pb-5 gap-3">
            {/* Title */}
            <Text
              className="text-[22px] text-text-strong leading-tight"
              style={{ fontFamily: FONTS.serif }}
              numberOfLines={3}
            >
              {storyTitle}
            </Text>

            {/* Body preview */}
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
