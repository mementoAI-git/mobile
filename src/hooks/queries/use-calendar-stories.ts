import { useQuery } from '@tanstack/react-query';
import { fetchAllPaginated } from '@/api/domain-fetchers';
import endpoint from '@/api/endpoint';
import { useAuthStore } from '@/store';
import type { IMemory } from '@/types';

export function useCalendarStories() {
  const token = useAuthStore((s) => s.token?.access_token);
  return useQuery({
    queryKey: ['stories', 'calendar'],
    queryFn: () => fetchAllPaginated<IMemory>(endpoint.stories),
    enabled: !!token,
    staleTime: 30_000,
  });
}
