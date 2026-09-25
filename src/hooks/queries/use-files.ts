import { useQuery } from '@tanstack/react-query';
import { fetchCollection } from '@/api/domain-fetchers';
import endpoint from '@/api/endpoint';
import { filesQueryKey, filesRequestUrl } from '@/features/files/query-options';
import { useAuthStore } from '@/store';

export function useFiles<T = unknown>(params: { limit: number }) {
  const token = useAuthStore((s) => s.token?.access_token);

  return useQuery({
    queryKey: filesQueryKey(params.limit),
    queryFn: () => fetchCollection<T>(filesRequestUrl(endpoint.files, params.limit)),
    enabled: !!token,
    staleTime: 60_000,
  });
}
