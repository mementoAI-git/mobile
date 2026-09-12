import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import type { CategoryScore } from '@/constants/enrichment';

import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import {
  clampEnrichmentScore,
  normalizeEnrichmentDimensions,
} from '@/features/account/account-overview';

export type InsightsTab = 'enrichment' | 'insights' | 'notes' | 'preferences';

const MAX_SCANNABLE_ITEM_LENGTH = 220;

function toScannableInsight(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= MAX_SCANNABLE_ITEM_LENGTH) return normalized;
  const boundary = normalized.slice(0, MAX_SCANNABLE_ITEM_LENGTH).lastIndexOf('.');
  return `${normalized.slice(0, boundary > 80 ? boundary + 1 : MAX_SCANNABLE_ITEM_LENGTH).trim()}…`;
}

interface InsightsContentCardProps {
  activeTab: InsightsTab;
  score: number;
  categoryScores?: CategoryScore[];
  insights: string[];
  notes: string[];
  preferences: string[];
}

const DIMENSION_COLORS = [
  COLORS.info,
  COLORS.blue6,
  COLORS.success,
  COLORS.onboardingGreenSoft,
  COLORS.warning,
  COLORS.onboardingAmberLight,
  COLORS.onboardingAmber,
  COLORS.brandWeak,
  COLORS.brand,
  COLORS.error,
] as const;

const TAB_TITLES: Record<Exclude<InsightsTab, 'enrichment'>, string> = {
  insights: 'Insights',
  notes: 'Important Notes',
  preferences: 'Preferences',
};

export const InsightsContentCard = React.memo(function InsightsContentCard({
  activeTab,
  score,
  categoryScores,
  insights,
  notes,
  preferences,
}: InsightsContentCardProps) {
  const dimensions = useMemo(
    () => normalizeEnrichmentDimensions(categoryScores),
    [categoryScores],
  );

  if (activeTab !== 'enrichment') {
    const items = activeTab === 'insights'
      ? insights
      : activeTab === 'notes'
        ? notes
        : preferences;

    return (
      <View style={styles.card}>
        <Text style={styles.title}>{TAB_TITLES[activeTab]}</Text>
        {items.length > 0 ? (
          <View style={{ gap: 10, marginTop: 14 }}>
            {items.map((item, index) => (
              <View key={`${activeTab}-${index}`} style={styles.listItem}>
                <View style={styles.bullet} />
                  <Text numberOfLines={4} style={styles.listText}>{toScannableInsight(item)}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Sparkles size={18} color={COLORS.brand} />
            </View>
            <Text style={styles.emptyTitle}>Your story is still unfolding</Text>
            <Text style={styles.emptyCopy}>
              Keep capturing memories and Memento will shape these insights over time.
            </Text>
          </View>
        )}
      </View>
    );
  }

  const safeScore = clampEnrichmentScore(score);

  return (
    <View style={styles.card}>
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
        style={styles.progress}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: safeScore }}
      >
        {dimensions.map((dimension, index) => (
          <View
            key={dimension.key}
            style={{ flex: 1, backgroundColor: DIMENSION_COLORS[index] }}
          />
        ))}
      </View>

      <View style={{ gap: 10, marginTop: 18 }}>
        {dimensions.map((dimension, index) => (
          <View key={dimension.key} style={styles.dimensionRow}>
            <View
              style={[
                styles.dimensionSwatch,
                { backgroundColor: DIMENSION_COLORS[index] },
              ]}
            />
            <Text style={styles.dimensionLabel}>{dimension.label}</Text>
            <Text style={styles.dimensionValue}>{dimension.score}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: COLORS.fillWeak,
    paddingHorizontal: 12,
    paddingVertical: 15,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  title: {
    color: COLORS.textStrong,
    ...TYPE.body,
    lineHeight: 20,
  },
  description: {
    color: COLORS.textBase,
    ...TYPE.metadata,
    lineHeight: 17,
    marginTop: 6,
  },
  score: {
    color: COLORS.textStrong,
    ...TYPE.displayTitle,
    lineHeight: 46,
    letterSpacing: -1.5,
  },
  progress: {
    height: 24,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    marginTop: 14,
  },
  dimensionRow: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dimensionSwatch: {
    width: 16,
    height: 16,
    borderRadius: 3,
    marginRight: 8,
  },
  dimensionLabel: {
    flex: 1,
    color: COLORS.textStrong,
    ...TYPE.label,
    lineHeight: 18,
  },
  dimensionValue: {
    color: COLORS.textStrong,
    ...TYPE.label,
    lineHeight: 18,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 12,
    padding: 12,
    backgroundColor: COLORS.card,
  },
  bullet: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 6,
    backgroundColor: COLORS.brand,
  },
  listText: {
    flex: 1,
    color: COLORS.textStrong,
    ...TYPE.label,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.brandSubtle,
  },
  emptyTitle: {
    color: COLORS.textStrong,
    ...TYPE.body,
    marginTop: 12,
  },
  emptyCopy: {
    color: COLORS.textWeak,
    ...TYPE.metadata,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
  },
});
