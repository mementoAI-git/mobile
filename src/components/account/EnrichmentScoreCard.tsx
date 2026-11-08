import type { ThemeColors } from '@/constants/tokens';
import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/Touchable';
import BarChart3 from 'lucide-react-native/icons/chart-column';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { iconSize, radius } from '@/constants/responsive';
import { clampEnrichmentScore } from '@/features/account/account-overview';
import { enrichmentStrength } from '@/features/overview/enrichment-strength';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);



interface EnrichmentScoreCardProps {
  score: number;
  onPress: () => void;
}

export const EnrichmentScoreCard = React.memo(function EnrichmentScoreCard({
  score,
  onPress,
}: EnrichmentScoreCardProps) {
  const COLORS = useThemeColors();
  const SCORE_SEGMENTS = [
  { color: COLORS.info, flex: 4 },
  { color: COLORS.blue6, flex: 2 },
  { color: COLORS.success, flex: 2 },
  { color: COLORS.warning, flex: 2 },
  { color: COLORS.brand, flex: 2 },
  { color: COLORS.error, flex: 1 },
] as const;
  const styles = useThemeStyles(createStyles);
  const safeScore = clampEnrichmentScore(score);
  const strength = enrichmentStrength(safeScore);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={FadeInDown.delay(240).duration(500)}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.98); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        style={[styles.card, animatedStyle]}
        accessibilityRole="button"
        accessibilityLabel={`Enrichment score: ${strength}. View memory insights.`}
      >
        <View style={styles.headingRow}>
          <Text style={styles.title} numberOfLines={1}>Enrichment score</Text>
          <Text style={styles.score} numberOfLines={1}>{strength}</Text>
        </View>
        <Text style={styles.description}>
          Your Enrichment score reflects your memory health across 10 key life areas.
        </Text>

        <View
          style={styles.progressTrack}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: safeScore }}
        >
          {SCORE_SEGMENTS.map((segment, index) => (
            <View
              key={`${segment.color}-${index}`}
              style={{ flex: segment.flex, backgroundColor: segment.color }}
            />
          ))}
        </View>

        <View style={styles.insightRow}>
          <View style={styles.insightIcon}>
            <BarChart3 size={iconSize(14)} color={COLORS.textInverse} strokeWidth={2.2} />
          </View>
          <Text style={styles.insightText}>Discover which areas need more context</Text>
          <ChevronRight size={iconSize(20)} color={COLORS.textWeak} strokeWidth={2.3} />
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
});

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  card: {
    minHeight: 160,
    borderRadius: 20,
    backgroundColor: COLORS.fillWeak,
    padding: 20,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    flexShrink: 1,
    color: COLORS.textStrong,
    ...TYPE.bodyLarge,
  },
  description: {
    color: COLORS.textBase,
    ...TYPE.bodySmall,
    marginTop: 4,
  },
  // The score as a word (Low, Medium, Strong), not a percentage.
  score: {
    flexShrink: 0,
    color: COLORS.textStrong,
    ...TYPE.bodyLargeSemi,
  },
  progressTrack: {
    height: 24,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    marginTop: 16,
    position: 'relative',
  },
  insightRow: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 12,
  },
  insightIcon: {
    width: iconSize(20),
    height: iconSize(20),
    borderRadius: radius(5),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.mediaSurface,
  },
  insightText: {
    flex: 1,
    color: COLORS.textStrong,
    ...TYPE.bodySmall,
  },
});
