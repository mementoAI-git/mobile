import { useQuery } from '@tanstack/react-query';
import { get } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import { useAuthStore } from '@/store';
import type { IMemory } from '@/types';

export interface MemorySearchData {
  docs: IMemory[];
  search?: {
    mode: 'hybrid' | 'keyword';
    preparing: boolean;
    limited?: boolean;
  };
}

/** Statuses where web falls back to a word search while description search rolls out. */
const FALLBACK_STATUSES = [404, 405, 410, 500, 501, 502, 503, 504];

/** Mirrors web `fetchMemorySearch` (Web/memento-web/src/api/memory-search.ts). */
export async function fetchMemorySearch(query: string): Promise<MemorySearchData> {
  try {
    const response = await get<MemorySearchData>(`${endpoint.memorySearch}?q=${encodeURIComponent(query)}`);
    const data = response.data;
    if (!data || !Array.isArray(data.docs)) throw new Error('Search returned an invalid response');
    return data;
  } catch (error: any) {
    const status = error?.response?.status ?? error?.status;
    // Keep auth, validation and rate-limit errors; fall back for the rest.
    if (!FALLBACK_STATUSES.includes(status ?? 0)) throw error;
    const response = await get<MemorySearchData>(
      `${endpoint.memories}?search=${encodeURIComponent(query)}&limit=20`,
    );
    const data = response.data;
    if (!data || !Array.isArray(data.docs)) throw new Error('Search returned an invalid response');
    return { ...data, search: { mode: 'keyword', preparing: false } };
  }
}

/** Searches the host's memories by description or words, like web's search sheet. */
export function useMemorySearch(query: string) {
  const token = useAuthStore((s) => s.token?.access_token);
  const trimmed = query.trim();
  return useQuery({
    queryKey: queryKeys.memorySearch(trimmed),
    queryFn: () => fetchMemorySearch(trimmed),
    enabled: !!token && trimmed.length > 0,
    retry: false,
    staleTime: 30_000,
    // Web polls while memories are still being prepared for description search.
    refetchInterval: (q) => (q.state.data?.search?.preparing ? 3000 : false),
  });
}
