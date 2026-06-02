import { useQuery } from '@tanstack/react-query';
import { get } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import { useUserStore, useAuthStore } from '@/store';

// User stats — streak, enrichment_score, quick_capture_pending_count, beneficiaries_count
export function useUserStats() {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: queryKeys.userStats,
    queryFn: async () => {
      const res = await get<any>(endpoint.userStats);
      const stats = res.data;

      // Sync updated stats to user store — but only when values actually change.
      // IMPORTANT: read user via getState() (not a reactive selector) so this
      // queryFn does NOT subscribe to useUserStore and cannot trigger a re-render
      // loop on the Overview screen.
      // Only sync `streak` — it's the one stat field that lives on IUser.
      // enrichment_score is read directly from statsData in the Overview screen.
      const { user, setUser } = useUserStore.getState();
      if (stats && user) {
        const newStreak = stats.streak_count ?? user.streak;
        if (newStreak !== user.streak) {
          setUser({ ...user, streak: newStreak });
        }
      }

      return stats;
    },
    enabled: !!token,
    staleTime: 30_000,
    refetchInterval: (query) => {
      // Poll every 4s if quick captures are pending (matches web behaviour)
      const pending = query.state.data?.quick_capture_pending_count;
      return Number(pending) > 0 ? 4_000 : false;
    },
  });
}

// Memories stats — stories_count, media_count, bookmark_count, storage, week_count
export function useMemoriesStats() {
  return useQuery({
    queryKey: queryKeys.memoriesStats,
    queryFn: () => get<any>(endpoint.memoriesStats).then((r) => r.data),
    staleTime: 60_000,
  });
}

// Capsule stats — scheduled_count, draft_count, delivered_count
export function useCapsuleStats() {
  return useQuery({
    queryKey: queryKeys.capsuleStats,
    queryFn: () => get<any>(endpoint.capsuleStats).then((r) => r.data),
    staleTime: 60_000,
  });
}
