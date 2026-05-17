import React from 'react';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { MoreVertical, ImageIcon, FileText, Bookmark } from 'lucide-react-native';
import { cn } from '@/lib/utils';
import { MemTag } from '@/components/ui';
import { useUiStore } from '@/store';
import { COLORS, FONTS } from '@/constants/tokens';
import type { IMemory } from '@/types';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
 
interface MemoryCardProps {
  memory: IMemory;
  className?: string;
  onPress?: () => void;
  isGrid?: boolean;
}
 
const isProduction = process.env.NODE_ENV === 'production';
 
const AnimatedImage = Animated.Image as any;
const AnimatedText = Animated.Text as any;
 
export function MemoryCard({ memory, className, onPress, isGrid }: MemoryCardProps) {
  const handlePress = onPress ?? (() => router.push(`/(tabs)/stories/${memory._id}`));
  const firstImage = memory.attachments?.find(
    (a) => a.type?.startsWith('image/') || a.type?.startsWith('video/'),
  );
  const hasMedia = Boolean(firstImage);
  const isBookmarked = memory.status === 'bookmarked';
 
  const cardScale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));
 
  return (
    <Animated.View
      style={[animStyle]}
      className={cn(
        'bg-white rounded-[24px] border border-stroke-weaker overflow-hidden',
        isGrid ? 'flex-1' : 'w-full mb-2',
        className,
      )}
    >
      <TouchableOpacity
        onPress={() => {
          Haptics.selectionAsync();
          handlePress();
        }}
        onPressIn={() => { cardScale.value = withSpring(0.97); }}
        onPressOut={() => { cardScale.value = withSpring(1); }}
        activeOpacity={0.9}
      >
        {/* ── Media Header ── */}
        {hasMedia ? (
          <View 
            className="w-full bg-fill-weak relative"
            style={{ height: isGrid ? verticalScale(144) : verticalScale(208) }}
          >
            <AnimatedImage
              sharedTransitionTag={`memory-image-${memory._id}`}
              source={{ uri: firstImage?.url }}
              className="w-full h-full"
              resizeMode="cover"
            />
            {isBookmarked && (
              <View className="absolute top-3 right-3 size-8 bg-white/90 rounded-full items-center justify-center shadow-sm">
                <Bookmark size={14} color={COLORS.brand} fill={COLORS.brand} />
              </View>
            )}
          </View>
        ) : (
          <View 
            className="w-full bg-fill-weaker items-center justify-center border-b border-stroke-weaker"
            style={{ height: isGrid ? verticalScale(80) : verticalScale(48) }}
          >
            {isBookmarked && (
              <View className="absolute top-3 right-3">
                <Bookmark size={14} color={COLORS.brand} fill={COLORS.brand} />
              </View>
            )}
            {isGrid && <FileText size={24} color={COLORS.textDisabled} strokeWidth={1.5} />}
          </View>
        )}
 
        {/* ── Content ── */}
        <View className="px-5 py-5 gap-2.5">
          <AnimatedText
            sharedTransitionTag={`memory-title-${memory._id}`}
            className="text-text-strong leading-snug"
            numberOfLines={2}
            style={{ 
              fontFamily: FONTS.serif,
              fontSize: isGrid ? moderateScale(16) : moderateScale(20)
            }}
          >
            {memory.title || 'Untitled Memory'}
          </AnimatedText>
 
          {!isGrid && memory.body ? (
            <AnimatedText
              className="text-sm text-text-base leading-relaxed opacity-80"
              numberOfLines={2}
              style={{ fontFamily: FONTS.sans }}
            >
              {memory.body?.replace(/<[^>]+>/g, '')}
            </AnimatedText>
          ) : null}

          {/* Tags */}
          {!isGrid && (memory.tags?.length ?? 0) > 0 && (
            <View className="flex-row flex-wrap gap-2 mt-1">
              {memory.tags!.slice(0, 3).map((tag) => (
                <MemTag key={tag} label={tag} />
              ))}
            </View>
          )}

          {/* Footer */}
          <View className="flex-row items-center justify-between mt-1 pt-3 border-t border-stroke-weaker">
            <Animated.Text className="text-[10px] text-text-muted uppercase tracking-widest font-bold" style={{ fontFamily: FONTS.sansBold }}>
              {memory.created_at
                ? new Date(memory.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })
                : ''}
            </Animated.Text>

            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                useUiStore.getState().openSheet('memory-actions', { memory });
              }}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              className="size-6 items-center justify-center"
              activeOpacity={0.6}
            >
              <MoreVertical size={16} color={COLORS.textWeak} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
});
