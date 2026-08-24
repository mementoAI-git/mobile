import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { Trophy } from 'lucide-react-native';
import { FONTS, COLORS } from '@/constants/tokens';

interface MilestoneCardProps {
  /** Points gained this session (0 = don't show) */
  enrichmentDelta?: number | null;
  /** Label for the milestone just reached (null = no milestone) */
  milestoneLabel?: string | null;
}

/**
 * MilestoneCard — shows when enrichment_delta > 0 (session score gain) or a milestone is newly crossed.
 * Appears as a floating celebratory toast that auto-dismisses after 4.5 seconds.
 */
export function MilestoneCard({ enrichmentDelta, milestoneLabel }: MilestoneCardProps) {
  const scale = useSharedValue(1);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    if (enrichmentDelta && enrichmentDelta > 0) {
      scale.value = withSequence(withSpring(1.05), withSpring(1));
    }
    const timer = setTimeout(() => {
      setVisible(false);
    }, 4500); // Auto-dismiss after 4.5 seconds
    return () => clearTimeout(timer);
  }, [enrichmentDelta, milestoneLabel]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const showDelta = (enrichmentDelta ?? 0) > 0;
  const showMilestone = Boolean(milestoneLabel);

  if (!visible || (!showDelta && !showMilestone)) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(400).springify().damping(15)}
      exiting={FadeOutUp.duration(300)}
      style={[styles.container, animStyle]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Trophy size={18} color="#8F6C1A" strokeWidth={2} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.titleText}>
            {showMilestone ? 'New Milestone Reached!' : 'Reflection Progress'}
          </Text>
          <Text style={styles.descriptionText}>
            {showMilestone ? milestoneLabel : `+${enrichmentDelta}% enrichment`}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    zIndex: 999,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 94, 0, 0.08)',
    // iOS shadow
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    // Android shadow
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(143, 108, 26, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  titleText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  descriptionText: {
    fontFamily: FONTS.serifMedium,
    fontSize: 15,
    color: COLORS.textStrong,
  },
});
