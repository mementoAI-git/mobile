import { useMutation, useQueryClient } from '@tanstack/react-query';
import { post } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import type { ProfileUpdatePayload } from '@/features/account/profile-form';
import { useAuthStore, useUserStore } from '@/store';
import type { IUser } from '@/types';

import client from '@/api/client';

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
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
}

export function useUploadProfilePicture() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uri, name, type }: { uri: string; name?: string; type?: string }) => {
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: name ?? `avatar_${Date.now()}.jpg`,
        type: type ?? 'image/jpeg',
      } as any);

      const response = await client.post<{ data: any }>(
        endpoint.uploadPicture,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      return response.data;
    },
    onSuccess: (response) => {
      const current = queryClient.getQueryData<IUser>(queryKeys.profile);
      const data = response?.data;
      const pictureUrl =
        (data as any)?.picture_url ??
        (data as any)?.url ??
        (typeof data === 'string' ? data : undefined);
      const picture = (data as any)?.picture ?? pictureUrl;

      const updated = {
        ...current,
        ...(data && typeof data === 'object' ? data : {}),
        ...(pictureUrl ? { picture_url: pictureUrl } : {}),
        ...(picture ? { picture } : {}),
      } as IUser;

      queryClient.setQueryData(queryKeys.profile, updated);
      const storedUser = useUserStore.getState().user;
      if (storedUser) {
        useUserStore.getState().setUser({ ...storedUser, ...updated });
      }
      const sessionUser = useAuthStore.getState().user;
      if (sessionUser) useAuthStore.getState().updateUser({ ...sessionUser, ...updated });

      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
}
