import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { fetchEntity, fetchPaginated } from '@/api/domain-fetchers';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import { useAuthStore } from '@/store';
import type { ICapsule, ICapsuleStats } from '@/types';

export function useCapsules(filter?: string) {
  const token = useAuthStore((s) => s.token?.access_token);

  return useInfiniteQuery({
    queryKey: queryKeys.capsules(filter),
    queryFn: ({ pageParam = 1 }) =>
      fetchPaginated<ICapsule>(
        `${endpoint.capsule}?page=${pageParam}${filter ? `&status=${filter}` : ''}`,
      ),
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    initialPageParam: 1,
    enabled: !!token,
    // 30s stale time — avoids refetch on every tab switch
    staleTime: 30_000,
  });
}

export function useCapsuleStats() {
  const token = useAuthStore((s) => s.token?.access_token);

  return useQuery({
    queryKey: queryKeys.capsuleStats,
    queryFn: () => fetchEntity<ICapsuleStats>(endpoint.capsuleStats),
    enabled: !!token,
    staleTime: 60_000,
  });
}
