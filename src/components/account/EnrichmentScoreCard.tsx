import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BarChart3, ChevronRight } from 'lucide-react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { clampEnrichmentScore } from '@/features/account/account-overview';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SCORE_SEGMENTS = [
  { color: COLORS.info, flex: 4 },
  { color: COLORS.blue6, flex: 2 },
  { color: COLORS.success, flex: 2 },
  { color: COLORS.warning, flex: 2 },
  { color: COLORS.brand, flex: 2 },
  { color: COLORS.error, flex: 1 },
] as const;

interface EnrichmentScoreCardProps {
  score: number;
  onPress: () => void;
}

export const EnrichmentScoreCard = React.memo(function EnrichmentScoreCard({
  score,
  onPress,
}: EnrichmentScoreCardProps) {
  const safeScore = clampEnrichmentScore(score);
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
        accessibilityLabel={`Enrichment score ${safeScore} percent. View memory insights.`}
      >
        <View style={styles.headingRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.title}>My Enrichment score</Text>
            <Text style={styles.description}>
              Your Enrichment score reflects your memory health across 10 key life areas.
            </Text>
          </View>
          <Text style={styles.score}>{safeScore}%</Text>
        </View>

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
            <BarChart3 size={14} color={COLORS.textInverse} strokeWidth={2.2} />
          </View>
          <Text style={styles.insightText}>Discover which areas need more context</Text>
          <ChevronRight size={20} color={COLORS.textWeak} strokeWidth={2.3} />
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    minHeight: 160,
    borderRadius: 16,
    backgroundColor: COLORS.fillWeak,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  title: {
    color: COLORS.textStrong,
    ...TYPE.body,
    lineHeight: 19,
  },
  description: {
    color: COLORS.textBase,
    ...TYPE.metadata,
    lineHeight: 16,
    marginTop: 5,
  },
  score: {
    color: COLORS.textStrong,
    ...TYPE.displayTitle,
    lineHeight: 46,
    letterSpacing: -1.5,
  },
  progressTrack: {
    height: 24,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    marginTop: 12,
    position: 'relative',
  },
  insightRow: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 7,
  },
  insightIcon: {
    width: 20,
    height: 20,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.textStrong,
  },
  insightText: {
    flex: 1,
    color: COLORS.textStrong,
    ...TYPE.metadata,
    lineHeight: 16,
  },
});
