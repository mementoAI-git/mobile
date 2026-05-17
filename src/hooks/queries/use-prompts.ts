import { useQuery } from '@tanstack/react-query';
import { get } from '@/api/mutations';
import dayjs from 'dayjs';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import type { IPrompt, IDashboardPromptSlot } from '@/types';

export function usePrompts(params?: { category?: string; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.prompts(params),
    queryFn: () => {
      const qs = new URLSearchParams();
      if (params?.category) qs.set('category', params.category);
      if (params?.limit) qs.set('limit', String(params.limit));
      const query = qs.toString() ? `?${qs.toString()}` : '';
      return get<IPrompt[]>(`${endpoint.prompts}${query}`).then((r) => r.data);
    },
    staleTime: 120_000,
  });
}

export function useDailyPrompts() {
  const dateKey = dayjs().format('YYYY-MM-DD');
  return useQuery({
    queryKey: ['daily-prompts', dateKey],
    queryFn: () =>
      get<IDashboardPromptSlot[]>(`${endpoint.prompts}?date_key=${dateKey}`).then(
        (r) => r.data,
      ),
    staleTime: 60_000,
  });
}

export function usePromptCategories() {
  return useQuery({
    queryKey: queryKeys.promptCategories,
    queryFn: () => get<any[]>(endpoint.promptCategories).then((r) => r.data),
    staleTime: 300_000,
  });
}

export function useOverviewPrompts() {
  return useQuery({
    queryKey: queryKeys.overviewPrompts,
    queryFn: () => get<any[]>(endpoint.overviewPrompt).then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useCategoryDetailsPrompts(slug: string, answered?: boolean) {
  return useQuery({
    queryKey: ['category-details-prompts', slug, answered],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (answered !== undefined) {
        qs.set('answered', String(answered));
      }
      const query = qs.toString() ? `?${qs.toString()}` : '';
      return get<any>(`${endpoint.promptCategories}${slug}${query}`).then((r) => {
        // Support paginated docs or raw array response
        if (r.data && typeof r.data === 'object') {
          const docs = r.data.docs || r.data.data?.docs;
          if (docs) {
            return {
              prompts: docs,
              totalDocs: r.data.totalDocs || r.data.data?.totalDocs || docs.length
            };
          }
        }
        const arr = Array.isArray(r.data) ? r.data : [];
        return {
          prompts: arr,
          totalDocs: arr.length
        };
      });
    },
    staleTime: 60_000,
  });
}

export function useMemoryByPrompt(promptId: string) {
  return useQuery({
    queryKey: ['memory-by-prompt', promptId],
    queryFn: () =>
      get<any>(`${endpoint.memoryPrompt}/${promptId}`).then((r) => r.data),
    enabled: !!promptId,
    staleTime: 0,
  });
}
