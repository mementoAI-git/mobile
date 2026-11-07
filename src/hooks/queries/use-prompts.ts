import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { fetchCollection, fetchEntity, fetchPaginated } from '@/api/domain-fetchers';
import dayjs from 'dayjs';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import { useAuthStore } from '@/store';
import { getCategoryTopicsUrl, getNextTopicsPage } from '@/features/explore/category-topics';
import { resolveExploreCategorySlug } from '@/features/explore/category-identity';
import type { ExploreCategory } from '@/features/explore/explore-catalog';
import type { IPrompt, IDashboardPromptSlot } from '@/types';

export function usePrompts(params?: { category?: string; limit?: number }) {
  const token = useAuthStore((s) => s.token?.access_token);

  return useQuery({
    queryKey: queryKeys.prompts(params),
    queryFn: () => {
      const qs = new URLSearchParams();
      if (params?.category) qs.set('category', params.category);
      if (params?.limit) qs.set('limit', String(params.limit));
      const query = qs.toString() ? `?${qs.toString()}` : '';
      return fetchCollection<IPrompt>(`${endpoint.prompts}${query}`);
    },
    enabled: !!token,
    staleTime: 120_000,
  });
}

export function useDailyPrompts() {
  const token = useAuthStore((s) => s.token?.access_token);
  const dateKey = dayjs().format('YYYY-MM-DD');

  return useQuery({
    queryKey: queryKeys.dailyPrompts(dateKey),
    queryFn: () =>
      fetchCollection<IDashboardPromptSlot>(`${endpoint.prompts}?date_key=${dateKey}`),
    enabled: !!token,
    staleTime: 60_000,
  });
}

export function usePromptCategories() {
  const token = useAuthStore((s) => s.token?.access_token);

  return useQuery({
    queryKey: queryKeys.promptCategories,
    queryFn: () => fetchCollection<ExploreCategory>(endpoint.exploreCategories),
    enabled: !!token,
    staleTime: 300_000,
  });
}

export function useOverviewPrompts() {
  const token = useAuthStore((s) => s.token?.access_token);

  return useQuery({
    queryKey: queryKeys.overviewPrompts,
    queryFn: () => fetchCollection<any>(endpoint.overviewPrompt),
    enabled: !!token,
    staleTime: 60_000,
  });
}

export function useCategoryDetailsPrompts(slug: string, answered?: boolean, enabled = true) {
  const token = useAuthStore((s) => s.token?.access_token);
  const canonicalSlug = resolveExploreCategorySlug(slug);

  return useInfiniteQuery({
    queryKey: queryKeys.categoryDetailsPrompts(canonicalSlug || '', answered),
    queryFn: ({ pageParam }) =>
      fetchPaginated<IPrompt>(getCategoryTopicsUrl(canonicalSlug || '', pageParam, answered)!),
    getNextPageParam: getNextTopicsPage,
    initialPageParam: 1,
    enabled: !!token && !!canonicalSlug && enabled,
    staleTime: 60_000,
  });
}

export function usePromptDetails(promptId: string) {
  const token = useAuthStore((s) => s.token?.access_token);
  return useQuery({
    queryKey: ['prompt-details', promptId],
    queryFn: () => fetchEntity<IPrompt>(`${endpoint.promptDetails}${encodeURIComponent(promptId)}`),
    enabled: !!token && /^[0-9a-fA-F]{24}$/.test(promptId),
    staleTime: 60_000,
  });
}

export function useMemoryByPrompt(promptId: string) {
  const token = useAuthStore((s) => s.token?.access_token);

  return useQuery({
    queryKey: queryKeys.memoryByPrompt(promptId),
    queryFn: async () => {
      try {
        return await fetchEntity<any>(`${endpoint.replyPrompt}/${promptId}`);
      } catch (err: any) {
        if (err?.response?.status === 404 || err?.status === 404) {
          return null;
        }
        throw err;
      }
    },
    enabled: !!token && !!promptId,
    staleTime: 0,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404 || error?.status === 404) return false;
      return failureCount < 2;
    },
  });
}
