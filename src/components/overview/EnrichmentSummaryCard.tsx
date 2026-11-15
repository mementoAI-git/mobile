import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Button } from '@/components/ui';
import { TouchableOpacity } from '@/components/ui/Touchable';
import type { ThemeColors } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { responsiveSpace } from '@/constants/responsive';
import { useThemeStyles } from '@/hooks/use-theme-colors';
import { enrichmentStrength } from '@/features/overview/enrichment-strength';

type EnrichmentSummaryCardProps = {
  /** Left out until it's known, rather than showing a strength that may be wrong. */
  score?: number;
  onViewInsight: () => void;
  /** Surface overrides, e.g. chat settings' 12px card without a border. */
  style?: StyleProp<ViewStyle>;
};

/**
 * Overview Enrichment score card — mirrors web chat settings
 * `enrichment-summary.tsx`: a neutral fill showing a word, not a number.
 */
export const EnrichmentSummaryCard = React.memo(function EnrichmentSummaryCard({
  score,
  onViewInsight,
  style,
}: EnrichmentSummaryCardProps) {
  const styles = useThemeStyles(createStyles);
  const strength = enrichmentStrength(score);

  // The whole card opens Insights, not only its pill.
  return (
    // A plain style array: NativeWind's Pressable interop can drop function-form
    // styles, which left this card with no fill, border, padding or radius.
    <TouchableOpacity
      onPress={onViewInsight}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Enrichment score: ${strength}. View insight`}
      style={[styles.card, style]}
    >
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          accessibilityLabel={`Enrichment score: ${strength}`}
          style={[TYPE.button, styles.title]}
        >
          {strength}
        </Text>
        <Button
          onPress={onViewInsight}
          size="sm"
          variant="ghost"
          rounded="full"
          className="bg-active-fill shrink-0"
          textClassName="text-active-text"
          style={styles.insightButton}
          hitSlop={{ top: 6, bottom: 6, left: 0, right: 0 }}
        >
          View Insight
        </Button>
      </View>
      <Text style={[TYPE.label, styles.description]}>
        {'Your Enrichment score reflects\nyour memory health across 10 key life areas.'}
      </Text>
    </TouchableOpacity>
  );
});

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  card: {
    // Matches the Overview calendar card's radius and padding, on the weak fill.
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.strokeWeak,
    backgroundColor: COLORS.fillWeak,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
    gap: responsiveSpace(12),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: responsiveSpace(12),
  },
  title: {
    flex: 1,
    minWidth: 0,
    color: COLORS.textStrong,
  },
  insightButton: {
    height: 32,
    minHeight: 32,
  },
  description: {
    color: COLORS.textStrong,
  },
});
