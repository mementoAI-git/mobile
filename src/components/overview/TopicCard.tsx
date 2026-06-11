import React from 'react';
import { View, Image, TouchableOpacity, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS } from '@/constants/tokens';
import { cn } from '@/lib/utils';
import Animated from 'react-native-reanimated';

interface TopicCardProps {
  title: string;
  image: any;
  category?: string;
  onPress?: () => void;
  className?: string;
}

/** Format slug "life-transition" → "Life transition" */
function formatCategory(slug: string): string {
  const formatted = slug
    .replace(/-/g, ' ')
    .replace(/\b\w/, (c) => c.toUpperCase());

  if (slug.toLowerCase() === 'relationship') return 'Relationships';
  return formatted;
}

export function TopicCard({ title, image, category, onPress, className }: TopicCardProps) {
  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.selectionAsync();
        onPress?.();
      }}
      activeOpacity={0.7}
      className={cn('gap-3', className)}
      style={{ width: 220 }}
    >
      {/* Image — flat corners (no border radius) */}
      <View style={{ width: '100%', height: 140, overflow: 'hidden', backgroundColor: COLORS.fillWeak }}>
        <Image
          source={image}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
        {/* Category tag — white pill top-left */}
        {category ? (
          <View style={{
            position: 'absolute',
            top: 10,
            left: 10,
            backgroundColor: 'rgba(255,255,255,0.92)',
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 999,
          }}>
            <Text style={{
              fontFamily: FONTS.sansSemi,
              fontSize: 11,
              color: COLORS.textStrong,
              lineHeight: 14,
            }}>
              {formatCategory(category)}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Title below image */}
      <View className="gap-1 px-1">
        <Animated.Text
          className="text-lg text-text-strong leading-tight"
          style={{ fontFamily: FONTS.serif }}
          numberOfLines={3}
        >
          {title}
        </Animated.Text>
      </View>
    </TouchableOpacity>
  );
}
