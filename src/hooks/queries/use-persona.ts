import { useQuery } from '@tanstack/react-query';
import { fetchEntity } from '@/api/domain-fetchers';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import type { IPersona } from '@/types';

export function usePersona() {
  return useQuery({
    queryKey: queryKeys.persona,
    queryFn: () => fetchEntity<IPersona>(endpoint.persona),
    staleTime: 300_000,
  });
}

export function useMemoryInsightsSummary() {
  return useQuery({
    queryKey: queryKeys.personaMemoryInsightsSummary,
    queryFn: () => 
      fetchEntity<{ summary: string | null; generated_at: string | null }>(endpoint.personaMemoryInsightsSummary),
    staleTime: 60_000,
  });
}

export function useUserContext() {
  return useQuery({
    queryKey: queryKeys.userContext,
    queryFn: () => fetchEntity<any>(endpoint.userContext),
    staleTime: 300_000,
  });
}
