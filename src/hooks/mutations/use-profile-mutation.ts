import { useMutation, useQueryClient } from '@tanstack/react-query';
import { put } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import type { ProfileUpdatePayload } from '@/features/account/profile-form';
import { useAuthStore, useUserStore } from '@/store';
import type { IUser } from '@/types';

import client from '@/api/client';

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ProfileUpdatePayload) => {
      const { context, ...profileData } = payload;
      const promises: Promise<any>[] = [
        put<IUser>(endpoint.profile, profileData),
      ];
      if (context?.self_description !== undefined) {
        promises.push(put(endpoint.persona, { self_description: context.self_description }));
      }
      const [profileRes] = await Promise.all(promises);
      return profileRes;
    },
    onSuccess: (response, payload) => {
      const current = queryClient.getQueryData<IUser>(queryKeys.profile);
      const returnedProfile = response?.data;
      const updatedContext = {
        ...(current?.context && typeof current.context === 'object' ? current.context : {}),
        ...(payload.context && typeof payload.context === 'object' ? payload.context : {}),
      };
      const updated = {
        ...current,
        ...payload,
        ...(returnedProfile && typeof returnedProfile === 'object' ? returnedProfile : {}),
        context: updatedContext,
      } as IUser;

      queryClient.setQueryData(queryKeys.profile, updated);
      if (updatedContext.self_description !== undefined) {
        queryClient.setQueryData(queryKeys.userContext, (context: any) => ({
          ...(context && typeof context === 'object' ? context : {}),
          self_description: updatedContext.self_description,
        }));
        queryClient.setQueryData(queryKeys.persona, (persona: any) => persona ? {
          ...persona,
          self_description: updatedContext.self_description,
        } : persona);
      }
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
      const filename = (data as any)?.name ?? (data as any)?.picture;
      const { resolveFileUrl } = require('@/features/account/profile-form');
      const pictureUrl =
        (data as any)?.picture_url ??
        (data as any)?.url ??
        (filename ? resolveFileUrl(filename) : undefined) ??
        (typeof data === 'string' ? resolveFileUrl(data) : undefined);
      const picture = filename ?? pictureUrl;

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
