import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { get } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import type { IMemory, IPagination } from '@/types';
import { shouldEnableStoriesQuery } from '@/features/memories/query-options';

interface StoriesQueryOptions {
  enabled?: boolean;
}

export function useMemories(params?: { limit?: number }) {
  return useInfiniteQuery({
    queryKey: queryKeys.memories(params),
    queryFn: ({ pageParam = 1 }) =>
      get<IPagination<IMemory>>(
        `${endpoint.memories}?page=${pageParam}&limit=${params?.limit ?? 20}`,
      ).then((r) => r.data),
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    initialPageParam: 1,
    // 30s stale time — avoids refetch on every tab switch
    staleTime: 30_000,
  });
}

export function useStories(
  params?: { limit?: number; filter?: string; search?: string },
  options?: StoriesQueryOptions,
) {
  return useInfiniteQuery({
    queryKey: queryKeys.stories(params),
    queryFn: ({ pageParam = 1 }) => {
      const qs = new URLSearchParams({
        page: String(pageParam),
        limit: String(params?.limit ?? 20),
      });
      if (params?.filter === 'bookmarked') qs.set('bookmarked', 'true');
      if (params?.filter === 'deleted') qs.set('status', 'deleted');
      if (params?.filter === 'pending') { qs.set('enrichment_status', 'pending'); qs.set('capture_source', 'quick'); }
      if (params?.search?.trim()) qs.set('search', params.search.trim());
      return get<IPagination<IMemory>>(`${endpoint.stories}?${qs.toString()}`).then((r) => r.data);
    },
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    initialPageParam: 1,
    enabled: shouldEnableStoriesQuery(options?.enabled),
    // 30s stale time — avoids refetch on every tab switch
    staleTime: 30_000,
  });
}

export function useConversations(params?: { limit?: number }) {
  return useInfiniteQuery({
    queryKey: queryKeys.conversations(params),
    queryFn: ({ pageParam = 1 }) =>
      get<IPagination<IMemory>>(
        `${endpoint.conversations}?page=${pageParam}&limit=${params?.limit ?? 20}`,
      ).then((r) => r.data),
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    initialPageParam: 1,
    staleTime: 30_000,
  });
}

export function useMemory(id: string) {
  return useQuery({
    queryKey: queryKeys.memory(id),
    queryFn: () =>
      get<IMemory>(endpoint.memory.replace(':id', id)).then((r) => r.data),
    enabled: !!id,
    // Individual memory detail — 30s so navigating back doesn't re-fetch
    staleTime: 30_000,
  });
}

export function useMemoriesStats() {
  return useQuery({
    queryKey: queryKeys.memoriesStats,
    queryFn: () => get<any>(endpoint.memoriesStats).then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useConversationMessages(id: string) {
  return useQuery({
    queryKey: queryKeys.promptMessages(id),
    queryFn: () =>
      get<any>(`${endpoint.aiPromptMessage}/${id}`).then((r) => r.data),
    enabled: !!id,
    staleTime: 0,
  });
}
