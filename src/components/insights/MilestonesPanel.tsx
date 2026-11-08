import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import { TYPE } from '@/constants/typography';
import {
  calculateMilestones,
  orderMilestones,
  countBeneficiaries,
  countSentCapsules,
} from '@/features/insights/milestone-celebrations';
import { useBeneficiaries } from '@/hooks/queries/use-beneficiaries';
import { useCapsuleStats, useMemoriesStats, useUserStats } from '@/hooks/queries/use-overview';
import { useProfile } from '@/hooks/queries/use-profile';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useUserStore } from '@/store';
import { INSIGHTS_RADIUS, InsightsMessage } from './InsightsPrimitives';

/** The milestones reached along the way. Adapted from web `milestones-panel.tsx`. */
export function MilestonesPanel() {
  const colors = useThemeColors();
  const streakOnUser = useUserStore((s) => s.user?.streak);
  const { data: profile } = useProfile();
  const { data: stats, error, isLoading, refetch } = useUserStats();
  const { data: memoriesStats } = useMemoriesStats();
  const { data: capsuleStats } = useCapsuleStats();
  const { data: beneficiaries } = useBeneficiaries();

  const streak = Number(streakOnUser) || Number(stats?.streak_count) || Number(profile?.streak) || 0;
  const milestones = useMemo(
    () =>
      orderMilestones(calculateMilestones({
        memoryCount: Number(memoriesStats?.stories_count ?? stats?.stories_count) || 0,
        reflectionCount: Number(stats?.reflections_count) || 0,
        streakDays: streak,
        enrichmentScore: Number(stats?.enrichment_score) || 0,
        capsuleCount: countSentCapsules(capsuleStats),
        beneficiaryCount: countBeneficiaries(beneficiaries),
      })),
    [beneficiaries, capsuleStats, memoriesStats?.stories_count, stats?.enrichment_score, stats?.reflections_count, stats?.stories_count, streak],
  );

  if (error && !stats) {
    return (
      <InsightsMessage
        body="Couldn’t load your milestones."
        actionLabel="Retry milestones"
        onAction={() => void refetch()}
      />
    );
  }
  if (isLoading && !stats) return <InsightsMessage loading body="Loading your milestones…" />;

  return (
    <View style={{ gap: 16 }}>
      {milestones.map((milestone) => (
        <View
          key={milestone.id}
          accessible
          accessibilityLabel={`${milestone.title}. ${milestone.description} ${milestone.progressLabel}`}
          accessibilityState={{ disabled: !milestone.available }}
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 16,
            paddingVertical: 20,
            paddingHorizontal: 16,
            borderRadius: INSIGHTS_RADIUS,
            backgroundColor: colors.fillWeak,
            opacity: milestone.available ? 1 : 0.5,
          }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: milestone.achieved ? 0 : 1.5,
              borderColor: colors.strokeWeak,
              backgroundColor: milestone.achieved ? colors.brandTint : 'transparent',
            }}
          >
            {milestone.achieved ? <Check size={16} color={colors.brand} strokeWidth={2.4} /> : null}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[TYPE.bodyStrong, { color: colors.textStrong }]}>{milestone.title}</Text>
            <Text style={[TYPE.bodySmall, { color: colors.textBase, marginTop: 4 }]}>{milestone.description}</Text>
          </View>
          <View
            style={{
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 4,
              backgroundColor: milestone.achieved ? colors.successFill : colors.fillWeak,
            }}
          >
            <Text style={[TYPE.metadata, { color: milestone.achieved ? colors.success : colors.textBase }]}>
              {milestone.progressLabel}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
