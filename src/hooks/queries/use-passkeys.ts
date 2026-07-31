import { useQuery } from '@tanstack/react-query';
import { get } from '@/api/mutations';
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
    queryFn: async () => {
      const response = await get<UserPasskey[] | { docs?: UserPasskey[] }>(
        endpoint.listPasskeys,
      );
      const data = response.data;
      if (Array.isArray(data)) return data;
      return data?.docs ?? [];
    },
    staleTime: 60_000,
  });
}
