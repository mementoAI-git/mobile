import { useQuery } from '@tanstack/react-query';
import { get } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import type { IGroup } from '@/types';

export function useGroups() {
  return useQuery({
    queryKey: queryKeys.groups,
    queryFn: () => get<IGroup[]>(endpoint.groups).then((r) => r.data),
    staleTime: 60_000,
  });
}
