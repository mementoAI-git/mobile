import { useQuery } from '@tanstack/react-query';
import { get } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { filesQueryKey, filesRequestUrl } from '@/features/files/query-options';

interface FilesResponse<T> {
  docs?: T[];
}

export function useFiles<T = unknown>(params: { limit: number }) {
  return useQuery({
    queryKey: filesQueryKey(params.limit),
    queryFn: () => get<FilesResponse<T>>(filesRequestUrl(endpoint.files, params.limit))
      .then((response) => response.data?.docs ?? []),
    staleTime: 60_000,
  });
}
