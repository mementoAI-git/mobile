import { useQuery } from '@tanstack/react-query';
import { fetchEntity } from '@/api/domain-fetchers';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import { useAuthStore, useUserStore } from '@/store';
import type { IUser } from '@/types';

export function useProfile() {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: async () => {
      const profile = await fetchEntity<IUser>(endpoint.profile);
      if (profile) {
        // Use getState() (imperative read) so this queryFn does NOT subscribe
        // to useUserStore reactively — avoids triggering a re-render loop on
        // every background refetch.
        useUserStore.getState().setUser(profile);
        if (useAuthStore.getState().token) useAuthStore.getState().updateUser(profile);
      }
      return profile;
    },
    enabled: !!token,
    staleTime: 60_000,
  });
}
