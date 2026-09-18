import React, { useMemo } from 'react';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';
import { FileText } from 'lucide-react-native';
import type { CategoryScore } from '@/constants/enrichment';

const ENRICHMENT_BG = require('../../../assets/images/backgrounds/enrichment_bg.png');
const MEMORIES_BG = require('../../../assets/images/backgrounds/memories_card_bg.png');
const STREAK_BG = require('../../../assets/images/backgrounds/streak_card_bg.png');
const BENEFI_BG = require('../../../assets/images/backgrounds/benefi_card_bg.png');

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

  const tabBg = useMemo(() => {
    switch (activeTab) {
      case 'enrichment':
        return ENRICHMENT_BG;
      case 'notes':
        return MEMORIES_BG;
      case 'insights':
        return STREAK_BG;
      case 'preferences':
        return BENEFI_BG;
      default:
        return ENRICHMENT_BG;
    }
  }, [activeTab]);

  if (activeTab !== 'enrichment') {
    const items = activeTab === 'insights'
      ? insights
      : activeTab === 'notes'
        ? notes
        : preferences;

    return (
      <View style={styles.card}>
        <ImageBackground
          source={tabBg}
          style={styles.cardBg}
          resizeMode="cover"
        >
          <View style={styles.tabHeaderRow}>
            <Text style={styles.eyebrow}>
              {TAB_TITLES[activeTab].toUpperCase()}
            </Text>
            {items.length > 0 && (
              <Text style={styles.itemCount}>
                {items.length} {items.length === 1 ? 'entry' : 'entries'}
              </Text>
            )}
          </View>

          {items.length > 0 ? (
            <View style={{ gap: 10, marginTop: 14 }}>
              {items.map((item, index) => (
                <View key={`${activeTab}-${index}`} style={styles.listItem}>
                  <View style={styles.bullet} />
                  <Text numberOfLines={4} style={styles.listText}>
                    {toScannableInsight(item)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <FileText size={22} color={COLORS.textWeak} strokeWidth={1.75} />
              </View>
              <Text style={styles.emptyTitle}>
                {activeTab === 'notes'
                  ? 'No notes yet'
                  : activeTab === 'insights'
                    ? 'No reflections yet'
                    : 'No preferences yet'}
              </Text>
              <Text style={styles.emptyCopy}>
                {activeTab === 'notes'
                  ? 'As you record memories and stories, your key notes and observations will be preserved here.'
                  : activeTab === 'insights'
                    ? 'Keep capturing moments and your personal archive will grow over time.'
                    : 'Your storytelling style and narrative preferences will appear here as you write.'}
              </Text>
            </View>
          )}
        </ImageBackground>
      </View>
    );
  }

  const safeScore = clampEnrichmentScore(score);

  return (
    <View style={styles.card}>
      <ImageBackground
        source={tabBg}
        style={styles.cardBg}
        resizeMode="cover"
      >
        <View style={styles.headingRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.eyebrow}>MY ENRICHMENT SCORE</Text>
            <Text style={styles.description}>
              Your memory health score across 10 core life dimensions.
            </Text>
          </View>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreNumber}>{safeScore}</Text>
            <Text style={styles.scorePercent}>%</Text>
          </View>
        </View>

        <View
          style={styles.progressTrack}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: safeScore }}
        >
          {dimensions.map((dimension, index) => (
            <View
              key={dimension.key}
              style={{
                flex: 1,
                height: '100%',
                backgroundColor: DIMENSION_COLORS[index],
              }}
            />
          ))}
        </View>

        <View style={{ gap: 8, marginTop: 20 }}>
          {dimensions.map((dimension, index) => (
            <View key={dimension.key} style={styles.dimensionRow}>
              <View style={styles.dimensionLeft}>
                <View
                  style={[
                    styles.dimensionSwatch,
                    { backgroundColor: DIMENSION_COLORS[index] },
                  ]}
                />
                <Text style={styles.dimensionLabel}>{dimension.label}</Text>
              </View>
              <View style={styles.dimensionPill}>
                <Text style={styles.dimensionValue}>{dimension.score}%</Text>
              </View>
            </View>
          ))}
        </View>
      </ImageBackground>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  cardBg: {
    alignSelf: 'stretch',
    padding: 20,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  tabHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: COLORS.textWeak,
    ...TYPE.eyebrow,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  itemCount: {
    color: COLORS.textWeak,
    ...TYPE.metadata,
  },
  description: {
    color: COLORS.textBase,
    ...TYPE.bodySmall,
    marginTop: 6,
    lineHeight: 19,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: COLORS.brandSubtle,
    borderWidth: 1,
    borderColor: 'rgba(255, 94, 0, 0.15)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  scoreNumber: {
    color: COLORS.brand,
    ...TYPE.screenTitle,
  },
  scorePercent: {
    color: COLORS.brand,
    ...TYPE.uiTitle,
    marginLeft: 2,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    flexDirection: 'row',
    overflow: 'hidden',
    marginTop: 18,
    backgroundColor: COLORS.fillWeak,
    gap: 2,
  },
  dimensionRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  dimensionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },
  dimensionSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
    marginRight: 10,
  },
  dimensionLabel: {
    color: COLORS.textStrong,
    ...TYPE.label,
  },
  dimensionPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
  },
  dimensionValue: {
    color: COLORS.textStrong,
    ...TYPE.metadata,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    backgroundColor: COLORS.brand,
  },
  listText: {
    flex: 1,
    color: COLORS.textStrong,
    ...TYPE.bodySmall,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 36,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.fillWeak,
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
  },
  emptyTitle: {
    color: COLORS.textStrong,
    ...TYPE.cardTitle,
    marginTop: 14,
  },
  emptyCopy: {
    color: COLORS.textWeak,
    ...TYPE.bodySmall,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 6,
  },
});
