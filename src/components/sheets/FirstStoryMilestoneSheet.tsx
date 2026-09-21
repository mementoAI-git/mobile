import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { BookOpen, Sparkles, X, Share2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { Button } from '@/components/ui';
import { useUiStore } from '@/store';

interface FirstStoryMilestoneSheetProps {
  memoryId: string;
  title?: string;
  onClose?: () => void;
}

export function FirstStoryMilestoneSheet({
  memoryId,
  title = 'Untitled Memory',
  onClose,
}: FirstStoryMilestoneSheetProps) {
  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleDismiss = () => {
    void Haptics.selectionAsync();
    onClose?.();
  };

  const handleShare = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose?.();
    setTimeout(() => {
      useUiStore.getState().openSheet('share-memory', { id: memoryId });
    }, 300);
  };

  return (
    <View className="flex-grow px-5 pb-8 pt-2">
      {/* Top Bar with 44x44 Close Button */}
      <View className="flex-row items-center justify-end mb-2">
        <TouchableOpacity
          onPress={handleDismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Close milestone celebration"
          className="size-11 rounded-full bg-fill-weaker items-center justify-center"
        >
          <X size={18} color={COLORS.textWeak} />
        </TouchableOpacity>
      </View>

      {/* Hero Icon */}
      <View className="items-center justify-center pt-1 pb-6">
        <View className="relative mb-5">
          <View className="size-20 rounded-3xl bg-brand/10 border border-brand/20 items-center justify-center shadow-sm">
            <BookOpen size={36} color={COLORS.brand} strokeWidth={2} />
          </View>
          <View className="absolute -top-1 -right-1 size-7 rounded-full bg-brand items-center justify-center">
            <Sparkles size={14} color="#FFFFFF" />
          </View>
        </View>

        <Text
          className="text-center text-text-strong mb-2.5"
          style={TYPE.sectionTitle}
        >
          Your First Chapter is Preserved
        </Text>
        <Text
          className="text-center text-text-weak px-4 leading-relaxed"
          style={TYPE.body}
        >
          The hardest part of creating an enduring legacy is writing the first sentence. Your memories are now safe in your personal archive.
        </Text>
      </View>

      {/* Story Card Preview */}
      <View className="bg-fill-weaker rounded-2xl border border-stroke-weaker p-4 mb-8">
        <Text className="text-text-muted uppercase tracking-wider mb-1" style={TYPE.metadata}>
          Chapter 1 · Archived Memory
        </Text>
        <Text className="text-text-strong" style={TYPE.cardTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {/* Action Buttons */}
      <View className="gap-3">
        <Button
          variant="primary"
          size="lg"
          className="h-14 w-full"
          onPress={handleShare}
        >
          Share with Loved Ones
        </Button>
        <Button
          variant="secondary"
          size="lg"
          className="h-14 w-full"
          onPress={handleDismiss}
        >
          Explore My Stories
        </Button>
      </View>
    </View>
  );
}
