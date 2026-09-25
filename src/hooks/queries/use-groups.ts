import { useQuery } from '@tanstack/react-query';
import { fetchAllPaginated } from '@/api/domain-fetchers';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import { useAuthStore } from '@/store';
import type { IGroup } from '@/types';

export function useGroups() {
  const token = useAuthStore((s) => s.token?.access_token);

  return useQuery({
    queryKey: queryKeys.groups,
    queryFn: () => fetchAllPaginated<IGroup>(endpoint.groups),
    enabled: !!token,
    staleTime: 60_000,
  });
}
