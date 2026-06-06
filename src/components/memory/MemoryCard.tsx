import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, Platform, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { MoreVertical, Bookmark, Mic, FileText } from 'lucide-react-native';
import { cn } from '@/lib/utils';
import { MemTag } from '@/components/ui';
import { useUiStore } from '@/store';
import { COLORS, FONTS, CARD_PASTEL_SURFACES } from '@/constants/tokens';
import type { IMemory } from '@/types';
import { moderateScale } from 'react-native-size-matters';
import dayjs from 'dayjs';

function stableHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h);
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface MemoryCardProps {
  memory: IMemory;
  className?: string;
  onPress?: () => void;
  /** isGrid is kept for backward-compat but the masonry view uses MasonryMemoryCard */
  isGrid?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const MemoryCard = React.memo(function MemoryCard({
  memory,
  className,
  onPress,
  isGrid = false,
}: MemoryCardProps) {
  const handlePress = onPress ?? (() => router.push(`/(tabs)/stories/${memory._id}`));

  const seed = stableHash(memory._id || memory.title || '');
  const surface = CARD_PASTEL_SURFACES[seed % CARD_PASTEL_SURFACES.length];

  const bannerMedia = memory.attachments?.find(
    (a) => a.type?.startsWith('image/') || a.type?.startsWith('video/'),
  );
  const audioMedia = !bannerMedia
    ? memory.attachments?.find((a) => a.type?.startsWith('audio/'))
    : undefined;
  const hasMedia = Boolean(bannerMedia);
  const isBookmarked = memory.status === 'bookmarked';
  const hasTopics = Array.isArray(memory.topics) && memory.topics.length > 0;

  const cardScale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }));
  const handlePressIn = useCallback(() => { cardScale.value = withSpring(0.98); }, [cardScale]);
  const handlePressOut = useCallback(() => { cardScale.value = withSpring(1); }, [cardScale]);

  const handleActions = useCallback(() => {
    Haptics.selectionAsync();
    useUiStore.getState().openSheet('memory-actions', { memory });
  }, [memory]);

  const dateStr = memory.created_at
    ? dayjs(memory.created_at).format('MMM D')
    : '';

  // ── Compact grid card (legacy — masonry handles the real grid now) ──────────
  if (isGrid) {
    return (
      <Animated.View
        style={[animStyle]}
        className={cn(
          'bg-white rounded-[20px] border border-stroke-weaker overflow-hidden flex-1',
          className,
        )}
      >
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); handlePress(); }}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
        >
          <View className="w-full bg-fill-weak" style={{ aspectRatio: 4 / 3 }}>
            {hasMedia ? (
              <Image source={{ uri: bannerMedia!.url }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <View className="w-full h-full items-center justify-center">
                <FileText size={24} color={COLORS.textDisabled} strokeWidth={1.5} />
              </View>
            )}
          </View>
          <View className="px-3 py-3 gap-1">
            <Text
              numberOfLines={2}
              className="text-text-strong leading-snug"
              style={{ fontFamily: FONTS.serif, fontSize: moderateScale(14) }}
            >
              {memory.title || 'Untitled'}
            </Text>
            <Text
              className="text-[10px] text-text-muted uppercase tracking-widest"
              style={{ fontFamily: FONTS.sansBold }}
            >
              {dateStr}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // ── Editorial list card ────────────────────────────────────────────────────

  const renderHero = () => {
    // ① Image / Video
    if (bannerMedia) {
      return (
        <View className="w-full overflow-hidden rounded-t-[24px] relative" style={{ aspectRatio: 3 / 2 }}>
          <Image
            source={{ uri: bannerMedia.url }}
            className="w-full h-full"
            resizeMode="cover"
          />
          {/* Date pill — overlaid bottom-left */}
          <View className="absolute bottom-3 left-4 bg-black/50 rounded-full px-2.5 py-1">
            <Text
              className="text-white text-[10px] font-bold uppercase tracking-wider"
              style={{ fontFamily: FONTS.sansBold }}
            >
              {dateStr}
            </Text>
          </View>
          {/* Actions pill — top-right, symmetric with date pill */}
          <TouchableOpacity
            onPress={handleActions}
            hitSlop={8}
            className="absolute top-3 right-4 bg-black/50 rounded-full px-2.5 py-1.5 items-center justify-center"
          >
            <MoreVertical size={14} color={COLORS.textInverse} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      );
    }

    // ② Audio
    if (audioMedia) {
      const duration = audioMedia.duration
        ? dayjs().startOf('day').add(audioMedia.duration, 'second').format('mm:ss')
        : '00:00';
      return (
        <View
          className="w-full rounded-t-[24px] bg-text-strong items-center justify-center gap-3 py-8 relative"
        >
          {/* Decorative wave lines */}
          {[0, 1, 2, 3, 4].map((i) => (
            <View
              key={i}
              className="absolute"
              style={{
                height: 1.5,
                width: `${45 + (i % 3) * 20}%`,
                backgroundColor: `${COLORS.textInverse}1f`,
                top: `${20 + i * 14}%`,
              }}
            />
          ))}
          <View className="flex-row items-center gap-3 bg-white/10 border border-white/20 rounded-full px-5 py-3">
            <Mic size={18} color={COLORS.textInverse} strokeWidth={1.5} />
            <Text className="text-white text-sm font-bold tracking-widest" style={{ fontFamily: FONTS.sansBold }}>
              {duration}
            </Text>
          </View>
          {/* Date pill */}
          <View className="absolute bottom-3 left-4 bg-black/40 rounded-full px-2.5 py-1">
            <Text
              className="text-white text-[10px] font-bold uppercase tracking-wider"
              style={{ fontFamily: FONTS.sansBold }}
            >
              {dateStr}
            </Text>
          </View>
          {/* Actions pill — top-right, symmetric with date pill */}
          <TouchableOpacity
            onPress={handleActions}
            hitSlop={8}
            className="absolute top-3 right-4 bg-black/50 rounded-full px-2.5 py-1.5 items-center justify-center"
          >
            <MoreVertical size={14} color={COLORS.textInverse} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      );
    }

    // ③ Text-only — seeded pastel surface
    return (
      <View
        style={{ backgroundColor: surface.bg, borderBottomWidth: 1, borderBottomColor: surface.border }}
        className="w-full rounded-t-[24px] px-6 pt-6 pb-5 gap-3"
      >
        <Text
          className="text-[22px] text-text-strong leading-snug"
          style={{ fontFamily: FONTS.serif }}
          numberOfLines={4}
        >
          {memory.title || 'Untitled Memory'}
        </Text>

        {/* Date pill on text card */}
        <View
          style={{ backgroundColor: surface.border, alignSelf: 'flex-start' }}
          className="rounded-full px-2.5 py-1"
        >
          <Text
            className="text-[10px] font-bold uppercase tracking-wider text-text-weak"
            style={{ fontFamily: FONTS.sansBold }}
          >
            {dateStr}
          </Text>
        </View>

        {/* Actions pill — top-right (replaces bookmark position) */}
        <TouchableOpacity
          onPress={handleActions}
          hitSlop={8}
          style={{ backgroundColor: `${surface.border}cc` }}
          className="absolute top-4 right-4 rounded-full px-2.5 py-1.5 items-center justify-center"
        >
          <MoreVertical size={14} color={COLORS.textWeak} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Animated.View
      style={[animStyle, styles.cardShadow]}
      className={cn(
        'bg-white rounded-[24px] overflow-hidden w-full mb-2 border border-stroke-weaker',
        className,
      )}
    >
      <TouchableOpacity
        onPress={() => { Haptics.selectionAsync(); handlePress(); }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.95}
      >
        {/* ── Hero ── */}
        {renderHero()}

        {/* ── Body ── */}
        <View className="px-5 pt-4 pb-5 gap-3">
          {/* Title (for media + audio cards) */}
          {(hasMedia || audioMedia) && (
            <Text
              className="text-[22px] text-text-strong leading-tight"
              style={{ fontFamily: FONTS.serif }}
              numberOfLines={3}
            >
              {memory.title || 'Untitled Memory'}
            </Text>
          )}

          {/* Body preview — user's own words, darkened for contrast (#555) */}
          {memory.body ? (
            <Text
              className="text-sm leading-relaxed"
              style={{ fontFamily: FONTS.sans, color: '#555555' }}
              numberOfLines={2}
            >
              {memory.body.replace(/<[^>]+>/g, '').trim()}
            </Text>
          ) : null}

          {/* Tags — user-defined only */}
          {(memory.tags?.length ?? 0) > 0 && (
            <View className="flex-row flex-wrap gap-2">
              {memory.tags!.slice(0, 4).map((tag) => (
                <MemTag key={tag} label={tag} />
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  cardShadow: {
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 16,
      },
      android: { elevation: 3 },
    }),
  },
});
