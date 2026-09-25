import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { fetchPaginated } from '@/api/domain-fetchers';
import endpoint from '@/api/endpoint';
import { getNextActivitiesPage } from '@/features/activities/pagination';
import { queryKeys } from '@/constants/query-keys';
import { useAuthStore } from '@/store';

export interface Activity {
  _id: string;
  title?: string;
  description: string;
  type?: string;
  action?: string;
  reference?: string;
  created_at: string;
  updated_at?: string;
}

export interface ActivitiesResponse {
  docs: Activity[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
}

export function useActivities(params?: { page?: number; limit?: number }) {
  const token = useAuthStore((s) => s.token?.access_token);

  return useQuery({
    queryKey: [...queryKeys.activities, params],
    queryFn: () => {
      const qs = new URLSearchParams();
      qs.set('page', String(params?.page || 1));
      qs.set('limit', String(params?.limit || 4));
      return fetchPaginated<Activity>(`${endpoint.activities}?${qs.toString()}`);
    },
    enabled: !!token,
    staleTime: 60_000,
  });
}

export function useInfiniteActivities(params?: { limit?: number }) {
  const token = useAuthStore((s) => s.token?.access_token);
  const limit = params?.limit ?? 20;

  return useInfiniteQuery({
    queryKey: [...queryKeys.activities, 'infinite', { limit }],
    queryFn: ({ pageParam = 1 }) => {
      const qs = new URLSearchParams({
        page: String(pageParam),
        limit: String(limit),
      });
      return fetchPaginated<Activity>(`${endpoint.activities}?${qs.toString()}`);
    },
    initialPageParam: 1,
    getNextPageParam: getNextActivitiesPage,
    enabled: !!token,
    staleTime: 60_000,
  });
}
