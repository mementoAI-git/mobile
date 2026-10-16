import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { get } from '@/api/mutations';
import { fetchEntity, fetchPaginated } from '@/api/domain-fetchers';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import type { IMemory } from '@/types';
import { shouldEnableStoriesQuery } from '@/features/memories/query-options';
import { useAuthStore } from '@/store';
import {
  getConversationMessagesUrl,
  getNextConversationCursor,
  type ConversationMessagePage,
} from '@/features/chat/conversation-pagination';

interface StoriesQueryOptions {
  enabled?: boolean;
}

export function useMemories(params?: { limit?: number; enabled?: boolean }) {
  const token = useAuthStore((s) => s.token?.access_token);
  // `enabled` gates the fetch without leaking into the cache key.
  const limit = params?.limit;
  const enabled = params?.enabled ?? true;

  return useInfiniteQuery({
    queryKey: queryKeys.memories(limit === undefined ? undefined : { limit }),
    queryFn: ({ pageParam = 1 }) =>
      fetchPaginated<IMemory>(
        `${endpoint.memories}?page=${pageParam}&limit=${params?.limit ?? 20}`,
      ),
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    initialPageParam: 1,
    enabled: !!token && enabled,
    // 30s stale time — avoids refetch on every tab switch
    staleTime: 30_000,
  });
}

export function useStories(
  params?: { limit?: number; filter?: string; search?: string },
  options?: StoriesQueryOptions,
) {
  const token = useAuthStore((s) => s.token?.access_token);

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
      return fetchPaginated<IMemory>(`${endpoint.stories}?${qs.toString()}`);
    },
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    initialPageParam: 1,
    enabled: !!token && shouldEnableStoriesQuery(options?.enabled),
    placeholderData: keepPreviousData,
    // 30s stale time — avoids refetch on every tab switch
    staleTime: 30_000,
  });
}

export function useConversations(params?: { limit?: number }) {
  const token = useAuthStore((s) => s.token?.access_token);

  return useInfiniteQuery({
    queryKey: queryKeys.conversations(params),
    queryFn: ({ pageParam = 1 }) =>
      fetchPaginated<IMemory>(
        `${endpoint.conversations}?page=${pageParam}&limit=${params?.limit ?? 20}`,
      ),
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    initialPageParam: 1,
    enabled: !!token,
    staleTime: 30_000,
  });
}

export function useMemory(id: string) {
  const token = useAuthStore((s) => s.token?.access_token);

  return useQuery({
    queryKey: queryKeys.memory(id),
    queryFn: () =>
      fetchEntity<IMemory>(endpoint.memory.replace(':id', id)),
    enabled: !!token && !!id,
    // Individual memory detail — 30s so navigating back doesn't re-fetch
    staleTime: 30_000,
  });
}

export function useMemoriesStats() {
  const token = useAuthStore((s) => s.token?.access_token);

  return useQuery({
    queryKey: queryKeys.memoriesStats,
    queryFn: () => fetchEntity<any>(endpoint.memoriesStats),
    enabled: !!token,
    staleTime: 60_000,
  });
}

export function useConversationAttachments(id: string) {
  const token = useAuthStore((s) => s.token?.access_token);

  return useQuery({
    queryKey: queryKeys.conversationAttachments(id),
    queryFn: () => fetchEntity<any>(endpoint.conversationAttachments.replace(':id', id)),
    enabled: !!token && !!id,
    staleTime: 30_000,
  });
}

export function useConversationMessages(id: string) {
  const token = useAuthStore((s) => s.token?.access_token);

  return useInfiniteQuery({
    queryKey: queryKeys.promptMessages(id),
    queryFn: ({ pageParam }) => {
      const cursor = typeof pageParam === 'string' ? pageParam : '';
      return get<ConversationMessagePage>(
        getConversationMessagesUrl(endpoint.aiPromptMessage, id, cursor),
      ).then((r) => r.data);
    },
    getNextPageParam: getNextConversationCursor,
    initialPageParam: '',
    enabled: !!token && !!id,
    staleTime: 0,
  });
}
