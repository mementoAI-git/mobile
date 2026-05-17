import { useMutation, useQueryClient } from '@tanstack/react-query';
import { post, put, del } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import type { ICapsule } from '@/types';

interface CapsulePayload {
  title: string;
  body: string;
  recipients: string[];
  schedule_date?: string;
  attachments?: string[];
  memories?: string[];
  status?: 'draft' | 'scheduled' | 'pause' | 'deleted' | 'delivered';
}

export function useCreateCapsule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CapsulePayload) =>
      post<ICapsule>(endpoint.capsule, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capsules'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.capsuleStats });
    },
  });
}

export function useUpdateCapsule(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<CapsulePayload>) =>
      put<ICapsule>(endpoint.capsuleDelete.replace(':id', id), payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.capsule(id) });
      queryClient.invalidateQueries({ queryKey: ['capsules'] });
    },
  });
}

export function useDeleteCapsule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      del(endpoint.capsuleDelete.replace(':id', id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capsules'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.capsuleStats });
    },
  });
}
