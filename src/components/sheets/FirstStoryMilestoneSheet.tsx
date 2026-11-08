import React from 'react';
import { Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui';
import { TYPE } from '@/constants/typography';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useUiStore } from '@/store';
import { CelebrationSheet, CelebrationSheetCard } from './CelebrationSheet';

const QUILL_INK = require('../../../assets/images/onboarding/quill-ink.png');

interface FirstStoryMilestoneSheetProps {
  memoryId: string;
  title?: string;
  onClose?: () => void;
}

/** Shown once, after the publish success page of the person's first story. */
export function FirstStoryMilestoneSheet({ memoryId, title, onClose }: FirstStoryMilestoneSheetProps) {
  const colors = useThemeColors();

  const handleShare = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose?.();
    setTimeout(() => useUiStore.getState().openSheet('share-memory', { id: memoryId }), 300);
  };

  return (
    <CelebrationSheet
      image={QUILL_INK}
      title="Your first chapter is preserved"
      description="The hardest part of a legacy is the first sentence. Your story is now safe in your archive."
      closeLabel="Close"
      onClose={onClose}
      actions={
        <>
          <Button variant="primary" className="h-14 w-full" onPress={handleShare}>
            Share with loved ones
          </Button>
          <Button variant="secondary" className="h-14 w-full" onPress={() => onClose?.()}>
            Done
          </Button>
        </>
      }
    >
      <CelebrationSheetCard>
        <View style={{ gap: 4 }}>
          <Text style={[TYPE.metadata, { color: colors.textWeak }]} className="uppercase tracking-widest">
            Chapter 1
          </Text>
          <Text style={[TYPE.cardTitle, { color: colors.textStrong }]} numberOfLines={2}>
            {title?.trim() || 'Untitled story'}
          </Text>
        </View>
      </CelebrationSheetCard>
    </CelebrationSheet>
  );
}
