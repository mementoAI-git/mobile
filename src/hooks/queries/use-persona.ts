import { useQuery } from '@tanstack/react-query';
import { get } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import type { IPersona } from '@/types';

export function usePersona() {
  return useQuery({
    queryKey: queryKeys.persona,
    queryFn: () => get<IPersona>(endpoint.persona).then((r) => r.data),
    staleTime: 300_000,
  });
}

export function useMemoryInsightsSummary() {
  return useQuery({
    queryKey: queryKeys.personaMemoryInsightsSummary,
    queryFn: () => 
      get<{ summary: string | null; generated_at: string | null }>(endpoint.personaMemoryInsightsSummary).then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useUserContext() {
  return useQuery({
    queryKey: queryKeys.userContext,
    queryFn: () => get<any>(endpoint.userContext).then((r) => r.data),
    staleTime: 300_000,
  });
}
