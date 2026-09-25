import { useQuery } from '@tanstack/react-query';
import { fetchEntity } from '@/api/domain-fetchers';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import { useAuthStore } from '@/store';
import type { IPersona } from '@/types';

export function usePersona() {
  const token = useAuthStore((s) => s.token?.access_token);

  return useQuery({
    queryKey: queryKeys.persona,
    queryFn: () => fetchEntity<IPersona>(endpoint.persona),
    enabled: !!token,
    staleTime: 300_000,
  });
}

export function useMemoryInsightsSummary() {
  const token = useAuthStore((s) => s.token?.access_token);

  return useQuery({
    queryKey: queryKeys.personaMemoryInsightsSummary,
    queryFn: () => 
      fetchEntity<{ summary: string | null; generated_at: string | null }>(endpoint.personaMemoryInsightsSummary),
    enabled: !!token,
    staleTime: 60_000,
  });
}

export function useUserContext() {
  const token = useAuthStore((s) => s.token?.access_token);

  return useQuery({
    queryKey: queryKeys.userContext,
    queryFn: () => fetchEntity<any>(endpoint.userContext),
    enabled: !!token,
    staleTime: 300_000,
  });
}
