/**
 * Enrichment stats hook — ported from web/src/features/enrichment/use-enrichment-stats.ts
 * Uses AsyncStorage instead of localStorage for persistence on mobile.
 */
import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { get } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import type { UserStatsData, LifeDimension } from '@/constants/enrichment';

const BASELINE_KEY = 'memento:enrichment:baseline';
const MILESTONE_KEY = 'memento:enrichment:lastMilestone';
const DISMISSED_NUDGES_KEY = 'memento:enrichment:dismissedNudges';

interface EnrichmentBaseline {
  score: number;
  date: string; // YYYY-MM-DD
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface UseEnrichmentStatsResult {
  stats: UserStatsData | null;
  isLoading: boolean;
  /** Score delta since the start of today (0 if no change yet today). */
  deltaToday: number;
  /** True when the current milestone threshold is newly reached this session. */
  milestoneJustReached: boolean;
  nudgeDimension: LifeDimension | null;
  nudgeQuestion: string | null;
  /** Dismiss a nudge dimension permanently (stored in AsyncStorage). */
  dismissNudge: (dimension: LifeDimension) => Promise<void>;
  getDismissedNudges: () => string[];
  /** Refetch stats (e.g. after each AI response). */
  refetch: () => void;
}

export function useEnrichmentStats(): UseEnrichmentStatsResult {
  const queryClient = useQueryClient();
  const [deltaToday, setDeltaToday] = useState(0);
  const [milestoneJustReached, setMilestoneJustReached] = useState(false);
  const [dismissedNudges, setDismissedNudges] = useState<string[]>([]);

  const lastMilestoneRef = useRef<number>(0);

  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.userStats,
    queryFn: () => get<UserStatsData>(endpoint.userStats).then((r) => r.data),
    staleTime: 30_000,
  });

  const stats = data ?? null;

  // Load dismissed nudges from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_NUDGES_KEY).then((raw) => {
      if (raw) {
        try { setDismissedNudges(JSON.parse(raw)); } catch { /* ignore */ }
      }
    });
    AsyncStorage.getItem(MILESTONE_KEY).then((raw) => {
      if (raw) lastMilestoneRef.current = Number(raw);
    });
  }, []);

  // Compute delta and milestone whenever stats change
  useEffect(() => {
    if (!stats) return;
    const score = stats.enrichment_score;
    const today = todayStr();

    AsyncStorage.getItem(BASELINE_KEY).then((raw) => {
      let baseline: EnrichmentBaseline | null = null;
      try { baseline = raw ? JSON.parse(raw) : null; } catch { /* ignore */ }

      if (!baseline || baseline.date !== today) {
        // First read today — set baseline, delta stays 0
        AsyncStorage.setItem(BASELINE_KEY, JSON.stringify({ score, date: today }));
        setDeltaToday(0);
      } else {
        setDeltaToday(Math.max(0, score - baseline.score));
      }
    });

    const reached = stats.milestone?.reached_threshold;
    if (reached != null && reached > lastMilestoneRef.current) {
      setMilestoneJustReached(true);
      lastMilestoneRef.current = reached;
      AsyncStorage.setItem(MILESTONE_KEY, String(reached));
    } else {
      setMilestoneJustReached(false);
    }
  }, [stats?.enrichment_score, stats?.milestone?.reached_threshold]);

  const dismissNudge = async (dimension: LifeDimension) => {
    const updated = [...dismissedNudges.filter((d) => d !== dimension), dimension];
    setDismissedNudges(updated);
    await AsyncStorage.setItem(DISMISSED_NUDGES_KEY, JSON.stringify(updated));
  };

  const getDismissedNudges = () => dismissedNudges;

  const nudgeDimension = (stats?.nudge?.category_key as LifeDimension | undefined) ?? null;
  const nudgeQuestion = stats?.nudge?.question ?? null;

  return {
    stats,
    isLoading,
    deltaToday,
    milestoneJustReached,
    nudgeDimension,
    nudgeQuestion,
    dismissNudge,
    getDismissedNudges,
    refetch,
  };
}
