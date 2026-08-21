import { useQuery } from '@tanstack/react-query';
import { get } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import { useAuthStore, useUserStore } from '@/store';
import type { IUser } from '@/types';

export function useProfile() {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: async () => {
      const res = await get<IUser>(endpoint.profile);
      if (res.data) {
        // Use getState() (imperative read) so this queryFn does NOT subscribe
        // to useUserStore reactively — avoids triggering a re-render loop on
        // every background refetch.
        useUserStore.getState().setUser(res.data);
        if (useAuthStore.getState().token) useAuthStore.getState().updateUser(res.data);
      }
      return res.data;
    },
    enabled: !!token,
    staleTime: 60_000,
  });
}
