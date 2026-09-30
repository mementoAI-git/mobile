import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { radius, responsiveSpace } from '@/constants/responsive';
import type { MemorySpotlight } from '@/constants/enrichment';

interface MemorySpotlightCardProps {
  spotlight?: MemorySpotlight | null;
  fallbackStory?: {
    _id?: string;
    title?: string;
    body?: string;
    created_at?: string;
    createdAt?: string;
  } | null;
  onPress?: () => void;
}

export function MemorySpotlightCard({
  spotlight,
  fallbackStory,
  onPress,
}: MemorySpotlightCardProps) {
  const router = useRouter();

  const memoryId = spotlight?.memory_id || fallbackStory?._id;
  const title = spotlight?.title?.trim() || fallbackStory?.title?.trim() || 'A Treasured Memory';
  const rawExcerpt = spotlight?.excerpt?.trim() || fallbackStory?.body?.trim() || '';

  if (!memoryId && !rawExcerpt) {
    return null;
  }

  // Calculate badge text (e.g. On this day vs From your vault)
  const dateStr = spotlight?.updated_at || fallbackStory?.created_at || fallbackStory?.createdAt;
  let badgeLabel = 'FROM YOUR VAULT';

  if (dateStr) {
    try {
      const memoryDate = new Date(dateStr);
      const now = new Date();
      const yearDiff = now.getFullYear() - memoryDate.getFullYear();
      if (yearDiff >= 1 && memoryDate.getMonth() === now.getMonth()) {
        badgeLabel = `${yearDiff} YEAR${yearDiff > 1 ? 'S' : ''} AGO TODAY`;
      }
    } catch {
      // fallback to default
    }
  }

  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onPress) {
      onPress();
      return;
    }
    if (memoryId) {
      router.push(`/(tabs)/stories/${memoryId}`);
    } else {
      router.push('/(tabs)/stories');
    }
  };

  return (
    <Animated.View entering={FadeInDown.delay(280)} className="gap-3">
      <View className="flex-row items-center justify-between px-1">
        <Text className="text-text-strong" style={TYPE.sectionTitle}>
          Memory <Text className="text-text-weak italic">Spotlight</Text>
        </Text>
      </View>

      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.92}
        accessibilityRole="button"
        accessibilityLabel={`Revisit memory: ${title}`}
        className="bg-white border border-stroke-weaker overflow-hidden"
        style={{
          borderRadius: radius(28),
          padding: responsiveSpace(20),
          shadowColor: COLORS.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 14,
          elevation: 2,
        }}
      >
        {/* Top Tag & Date Row */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="bg-brand/10 px-3 py-1 rounded-full flex-row items-center">
            <Text className="text-brand uppercase tracking-wider" style={TYPE.metadata}>
              {badgeLabel}
            </Text>
          </View>
        </View>

        {/* Story Title */}
        <Text className="text-text-strong mb-2" style={TYPE.cardTitle} numberOfLines={2}>
          {title}
        </Text>

        {/* Excerpt */}
        {rawExcerpt ? (
          <Text
            className="italic leading-relaxed mb-4"
            style={{ ...TYPE.body, color: '#555555' }}
            numberOfLines={3}
          >
            “{rawExcerpt}”
          </Text>
        ) : null}

        {/* Revisit CTA Row */}
        <View className="flex-row items-center justify-between pt-3 border-t border-stroke-weaker">
          <Text className="text-brand" style={TYPE.label}>
            Revisit Story →
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
