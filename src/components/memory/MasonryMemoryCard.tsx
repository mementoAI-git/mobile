import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { MoreHorizontal, Mic } from 'lucide-react-native';
import { useUiStore } from '@/store';
import { COLORS, FONTS, CARD_PASTEL_SURFACES } from '@/constants/tokens';
import type { IMemory } from '@/types';
import dayjs from 'dayjs';

// ─── Seeding helpers (mirrors web grid.tsx) ──────────────────────────────────

const MEDIA_ASPECT_RATIOS = [4 / 5, 5 / 6, 3 / 4, 1] as const;

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
}

export const MasonryMemoryCard = React.memo(function MasonryMemoryCard({
  memory,
  onPress,
}: MasonryMemoryCardProps) {
  const handlePress = onPress ?? (() => router.push(`/(tabs)/stories/${memory._id}`));

  const seed = stableHash(memory._id || memory.title || '');
  const aspectRatio = MEDIA_ASPECT_RATIOS[seed % MEDIA_ASPECT_RATIOS.length];
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
          className="w-full rounded-[20px] overflow-hidden bg-text-strong items-center justify-center relative"
        >
          {/* Wave pattern background */}
          <View className="absolute inset-0 items-center justify-center opacity-20">
            {[...Array(6)].map((_, i) => (
              <View
                key={i}
                className="absolute w-full"
                style={{
                  height: 2,
                  backgroundColor: COLORS.textInverse,
                  top: `${15 + i * 14}%`,
                  opacity: 0.4 + i * 0.1,
                  transform: [{ scaleX: 0.7 + (i % 3) * 0.15 }],
                }}
              />
            ))}
          </View>

          <View className="items-center gap-2 z-10 bg-white/10 border border-white/20 rounded-[20px] px-5 py-4 backdrop-blur-md">
            <Mic size={28} color={COLORS.textInverse} strokeWidth={1.5} />
            <Text className="text-white text-sm font-bold tracking-widest" style={{ fontFamily: FONTS.sansBold }}>
              {duration}
            </Text>
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
        style={{ backgroundColor: surface.bg, borderColor: surface.border, borderWidth: 1 }}
        className="w-full rounded-[20px] p-4 gap-3 relative"
      >
        <Text
          className="text-[15px] text-text-strong leading-snug font-semibold"
          style={{ fontFamily: FONTS.sansSemi }}
          numberOfLines={3}
        >
          {storyTitle}
        </Text>

        {/* User's own body text only — no AI-generated metadata */}
        {memory.body ? (
          <Text
            className="text-xs text-text-weak leading-relaxed"
            style={{ fontFamily: FONTS.sans }}
            numberOfLines={4}
          >
            {memory.body.replace(/<[^>]+>/g, '').trim()}
          </Text>
        ) : null}

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
