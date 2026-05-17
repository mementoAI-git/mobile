import { useQuery } from '@tanstack/react-query';
import { get } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import { useUserStore, useAuthStore } from '@/store';

// User stats — streak, enrichment_score, quick_capture_pending_count, beneficiaries_count
export function useUserStats() {
  const token = useAuthStore((s) => s.token);
  const user = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);

  return useQuery({
    queryKey: queryKeys.userStats,
    queryFn: async () => {
      const res = await get<any>(endpoint.userStats);
      const stats = res.data;
      // If we have a user in store, sync any updated stats like streak
      if (stats && user) {
        setUser({
          ...user,
          streak: stats.streak_count ?? user.streak,
          enrichment_score: stats.enrichment_score ?? user.enrichment_score,
        });
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
