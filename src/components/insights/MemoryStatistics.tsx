import React from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/ui';
import { TYPE } from '@/constants/typography';
import { enrichmentStrength } from '@/features/overview/enrichment-strength';
import { useMemoriesStats, useUserStats } from '@/hooks/queries/use-overview';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useUserStore } from '@/store';
import { INSIGHTS_RADIUS } from './InsightsPrimitives';

/** Web `memory-statistics.tsx`: four account figures above the sections. */
export function MemoryStatistics() {
  const colors = useThemeColors();
  const streakOnUser = useUserStore((s) => s.user?.streak);
  const { data: stats, error, isLoading, refetch } = useUserStats();
  const { data: memoriesStats } = useMemoriesStats();
  const score = Math.min(100, Math.max(0, Number(stats?.enrichment_score) || 0));

  const metrics = [
    { label: 'Stories', value: memoriesStats?.stories_count ?? stats?.stories_count ?? 0 },
    { label: 'Reflections', value: stats?.reflections_count ?? 0 },
    { label: 'Current streak', value: Number(streakOnUser) || Number(stats?.streak_count) || 0 },
    { label: 'Enrichment score', value: enrichmentStrength(score) },
  ];
  const failed = Boolean(error) && !stats;

  return (
    <View accessibilityLabel="Memory statistics" style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {metrics.map((metric) => (
          <View
            key={metric.label}
            style={{
              flexGrow: 1,
              flexBasis: '45%',
              minHeight: 76,
              justifyContent: 'center',
              gap: 6,
              borderRadius: INSIGHTS_RADIUS,
              padding: 14,
              backgroundColor: colors.fillWeak,
            }}
          >
            <Text style={[TYPE.insightStat, { color: colors.textStrong, fontVariant: ['tabular-nums'] }]} numberOfLines={1}>
              {failed ? '—' : isLoading && !stats ? '…' : String(metric.value)}
            </Text>
            <Text style={[TYPE.bodySmall, { color: colors.textBase }]} numberOfLines={1}>
              {metric.label}
            </Text>
          </View>
        ))}
      </View>
      {failed ? (
        <Button variant="outline" size="md" onPress={() => void refetch()}>
          Retry statistics
        </Button>
      ) : null}
    </View>
  );
}
