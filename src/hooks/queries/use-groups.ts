import { useQuery } from '@tanstack/react-query';
import { fetchAllPaginated } from '@/api/domain-fetchers';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import type { IGroup } from '@/types';

export function useGroups() {
  return useQuery({
    queryKey: queryKeys.groups,
    queryFn: () => fetchAllPaginated<IGroup>(endpoint.groups),
    staleTime: 60_000,
  });
}
