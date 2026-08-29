import { useQuery } from '@tanstack/react-query';
import { fetchCollection } from '@/api/domain-fetchers';
import endpoint from '@/api/endpoint';
import { filesQueryKey, filesRequestUrl } from '@/features/files/query-options';

export function useFiles<T = unknown>(params: { limit: number }) {
  return useQuery({
    queryKey: filesQueryKey(params.limit),
    queryFn: () => fetchCollection<T>(filesRequestUrl(endpoint.files, params.limit)),
    staleTime: 60_000,
  });
}
