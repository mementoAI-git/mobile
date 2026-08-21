import { useMutation, useQueryClient } from '@tanstack/react-query';
import { post } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import type { ProfileUpdatePayload } from '@/features/account/profile-form';
import { useAuthStore, useUserStore } from '@/store';
import type { IUser } from '@/types';

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProfileUpdatePayload) =>
      post<IUser, ProfileUpdatePayload>(endpoint.profile, payload),
    onSuccess: (response, payload) => {
      const current = queryClient.getQueryData<IUser>(queryKeys.profile);
      const returnedProfile = response?.data;
      const updated = {
        ...current,
        ...payload,
        ...(returnedProfile && typeof returnedProfile === 'object' ? returnedProfile : {}),
      } as IUser;

      queryClient.setQueryData(queryKeys.profile, updated);
      const storedUser = useUserStore.getState().user;
      if (storedUser) {
        useUserStore.getState().setUser({ ...storedUser, ...updated });
      }
      const sessionUser = useAuthStore.getState().user;
      if (sessionUser) useAuthStore.getState().updateUser({ ...sessionUser, ...updated });
    },
  });
}
