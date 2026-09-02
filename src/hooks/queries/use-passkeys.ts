import { useQuery } from '@tanstack/react-query';
import { fetchCollection } from '@/api/domain-fetchers';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';

export interface UserPasskey {
  id?: string;
  credential_id?: string;
  name?: string;
  device_name?: string;
  created_at?: string;
}

export function usePasskeys() {
  return useQuery({
    queryKey: queryKeys.passkeys,
    queryFn: () => fetchCollection<UserPasskey>(endpoint.listPasskeys),
    staleTime: 60_000,
  });
}
