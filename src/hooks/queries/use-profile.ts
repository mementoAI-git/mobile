import { useQuery } from '@tanstack/react-query';
import { get } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import { useAuthStore, useUserStore } from '@/store';
import type { IUser } from '@/types';

export function useProfile() {
  const token = useAuthStore((s) => s.token);
  const setUser = useUserStore((s) => s.setUser);

  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: async () => {
      const res = await get<IUser>(endpoint.profile);
      if (res.data) setUser(res.data);
      return res.data;
    },
    enabled: !!token,
    staleTime: 60_000,
  });
}

