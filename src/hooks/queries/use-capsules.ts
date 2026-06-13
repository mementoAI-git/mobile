import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { get } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import type { ICapsule, ICapsuleStats, IPagination } from '@/types';

export function useCapsules(filter?: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.capsules(filter),
    queryFn: ({ pageParam = 1 }) =>
      get<IPagination<ICapsule>>(
        `${endpoint.capsule}?page=${pageParam}${filter ? `&status=${filter}` : ''}`,
      ).then((r) => r.data),
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    initialPageParam: 1,
    // 30s stale time — avoids refetch on every tab switch
    staleTime: 30_000,
  });
}

export function useCapsuleStats() {
  return useQuery({
    queryKey: queryKeys.capsuleStats,
    queryFn: () => get<ICapsuleStats>(endpoint.capsuleStats).then((r) => r.data),
    staleTime: 60_000,
  });
}
