import { useMemo, useCallback } from 'react';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useUiStore, useUserStore } from '@/store';
import { useUserStats, useMemoriesStats, useCapsuleStats } from '@/hooks/queries/use-overview';
import { useOverviewPrompts, useDailyPrompts } from '@/hooks/queries/use-prompts';
import { useActivities } from '@/hooks/queries/use-activities';
import { useStartConversation } from '@/hooks/mutations/use-memory-mutations';
import type { IMemory } from '@/types';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 7) return "Up early today,";
  if (hour >= 7 && hour < 12) return "Good morning,";
  if (hour >= 12 && hour < 17) return "Good afternoon,";
  if (hour >= 17 && hour < 21) return "Good evening,";
  if (hour >= 21) return "Night owl mode,";
  return "Still going,";
}

export function useOverviewLogic() {
  const router = useRouter();
  const openSheet = useUiStore((s) => s.openSheet);
  const user = useUserStore((s) => s.user);
  
  const greeting = useMemo(() => getGreeting(), []);
  const isDaytime = new Date().getHours() >= 6 && new Date().getHours() < 17;

  // Data fetching
  const { data: statsData, refetch: refetchStats, isRefetching, isLoading: statsLoading } = useUserStats();
  const { data: memoriesStats, isLoading: memoriesLoading } = useMemoriesStats();
  const { data: capsuleStats, isLoading: capsuleLoading } = useCapsuleStats();
  const { data: dailyPrompts, isLoading: promptsLoading } = useDailyPrompts();
  const { data: overviewTopics, isLoading: topicsLoading } = useOverviewPrompts();
  const { data: activitiesData, isLoading: activitiesLoading } = useActivities({ page: 1, limit: 4 });
  const { mutate: startConversation, isPending: startingConversation } = useStartConversation();

  const handleStartConversation = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startConversation({ text: 'Hello' }, {
      onSuccess: (res) => {
        const memory = res.data as any;
        const memoryId = memory?._id || memory?.memory_id || memory?.id;
        router.push({ pathname: '/chat/[id]', params: { id: memoryId } });
      },
    });
  }, [router, startConversation]);

  const stats = statsData ?? {};
  const streakCount = Number(user?.streak) || Number(stats.streak_count) || 0;
  const enrichmentScore = Number(stats.enrichment_score) || 0;
  const memoriesCount = memoriesStats?.stories_count ?? 0;
  const beneficiariesCount = Number(stats.beneficiaries_count) || 0;
  const capsuleCount = capsuleStats?.scheduled_count || 0;
  const quickPending = Number(stats.quick_capture_pending_count) || 0;

  const prompts = dailyPrompts || [];
  const topics = overviewTopics || [];
  const activities = activitiesData?.docs || [];

  const displayName = user?.nickname || user?.first_name || user?.last_name || '';
  const isLoading = statsLoading || memoriesLoading || capsuleLoading || promptsLoading || topicsLoading || activitiesLoading;

  return useMemo(
    () => ({
      router,
      openSheet,
      user,
      greeting,
      isDaytime,
      isLoading,
      isRefetching,
      refetchStats,
      startingConversation,
      handleStartConversation,
      streakCount,
      enrichmentScore,
      memoriesCount,
      beneficiariesCount,
      capsuleCount,
      quickPending,
      prompts,
      topics,
      activities,
      displayName,
    }),
    [
      router,
      openSheet,
      user,
      greeting,
      isDaytime,
      isLoading,
      isRefetching,
      refetchStats,
      startingConversation,
      handleStartConversation,
      streakCount,
      enrichmentScore,
      memoriesCount,
      beneficiariesCount,
      capsuleCount,
      quickPending,
      prompts,
      topics,
      activities,
      displayName,
    ],
  );
}
