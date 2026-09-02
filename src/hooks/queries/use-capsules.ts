import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { fetchEntity, fetchPaginated } from '@/api/domain-fetchers';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import type { ICapsule, ICapsuleStats } from '@/types';

export function useCapsules(filter?: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.capsules(filter),
    queryFn: ({ pageParam = 1 }) =>
      fetchPaginated<ICapsule>(
        `${endpoint.capsule}?page=${pageParam}${filter ? `&status=${filter}` : ''}`,
      ),
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    initialPageParam: 1,
    // 30s stale time — avoids refetch on every tab switch
    staleTime: 30_000,
  });
}

export function useCapsuleStats() {
  return useQuery({
    queryKey: queryKeys.capsuleStats,
    queryFn: () => fetchEntity<ICapsuleStats>(endpoint.capsuleStats),
    staleTime: 60_000,
  });
}
