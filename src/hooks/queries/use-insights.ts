import { useQuery } from '@tanstack/react-query';
import { fetchEntity } from '@/api/domain-fetchers';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import type {
  InsightList,
  InsightSource,
  PersonaObservationsResponse,
} from '@/features/insights/insights-model';
import { useAuthStore } from '@/store';

const GENERATING_POLL_MS = 5_000;
/** Picks up what changes elsewhere, like a chat or another device. Matches web. */
const OBSERVATIONS_POLL_MS = 10_000;
/** Insight batches change far less often than notes. */
const INSIGHTS_POLL_MS = 30_000;

/** What Memento has noted about the member, kept current while it is on screen. */
export function useObservations() {
  const token = useAuthStore((s) => s.token?.access_token);
  return useQuery({
    queryKey: queryKeys.observations,
    queryFn: () => fetchEntity<PersonaObservationsResponse>(endpoint.personaObservations),
    enabled: !!token,
    refetchInterval: (query) =>
      query.state.data?.generating ? GENERATING_POLL_MS : OBSERVATIONS_POLL_MS,
  });
}

/** The current batch of insights. */
export function useInsightList() {
  const token = useAuthStore((s) => s.token?.access_token);
  return useQuery({
    queryKey: queryKeys.insights,
    queryFn: () => fetchEntity<InsightList>(endpoint.insights),
    enabled: !!token,
    refetchInterval: (query) =>
      query.state.data?.generating ? GENERATING_POLL_MS : INSIGHTS_POLL_MS,
  });
}

/** The memories behind an insight, a note, or an enrichment field. */
export function useInsightSources(url: string) {
  const token = useAuthStore((s) => s.token?.access_token);
  return useQuery({
    queryKey: queryKeys.insightSources(url),
    queryFn: async () =>
      (await fetchEntity<{ sources: InsightSource[] }>(url))?.sources ?? [],
    enabled: !!token,
    staleTime: 60_000,
  });
}
