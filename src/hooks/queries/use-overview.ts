import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchEntity } from '@/api/domain-fetchers';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import { useUserStore, useAuthStore } from '@/store';

// User stats — streak, enrichment_score, quick_capture_pending_count, beneficiaries_count
export function useUserStats() {
  const token = useAuthStore((s) => s.token);
  // Caps the 4s quick-capture poll: if the backend stays pending past this
  // window the enrichment is stuck, so stop polling and fall back to the
  // normal 30s-stale refetch instead of polling forever.
  const pendingSinceRef = useRef<number | null>(null);

  return useQuery({
    queryKey: queryKeys.userStats,
    queryFn: async () => {
      const stats = await fetchEntity<any>(endpoint.userStats);

      // Sync updated stats to user store — but only when values actually change.
      // IMPORTANT: read user via getState() (not a reactive selector) so this
      // queryFn does NOT subscribe to useUserStore and cannot trigger a re-render
      // loop on the Overview screen.
      // Only sync `streak` — it's the one stat field that lives on IUser.
      // enrichment_score is read directly from statsData in the Overview screen.
      const user = useUserStore.getState().user ?? useAuthStore.getState().user;
      if (stats && user) {
        const newStreak = stats.streak_count ?? user.streak;
        if (newStreak !== user.streak) {
          const next = { ...user, streak: newStreak };
          useUserStore.getState().setUser(next);
          useAuthStore.getState().updateUser(next);
        }
      }

      return stats;
    },
    enabled: !!token,
    staleTime: 30_000,
    refetchInterval: (query) => {
      // Poll every 4s if quick captures are pending (matches web behaviour),
      // up to 2 min — then back off to avoid polling a stuck backend forever.
      const pending = Number(query.state.data?.quick_capture_pending_count) > 0;
      if (!pending) {
        pendingSinceRef.current = null;
        return false;
      }
      if (pendingSinceRef.current === null) pendingSinceRef.current = Date.now();
      return Date.now() - pendingSinceRef.current > 120_000 ? false : 4_000;
    },
  });
}

// Canonical stats hooks live with their domains (single queryFn per cache key).
// Re-exported here so existing import sites don't churn.
export { useMemoriesStats } from './use-memories';
export { useCapsuleStats } from './use-capsules';
