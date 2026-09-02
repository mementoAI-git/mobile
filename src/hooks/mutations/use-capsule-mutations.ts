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
  style?: {
    themeId?: string;
    backgroundColor: string;
    fontSize: string;
    textColor?: string;
    headerColor?: string;
  };
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
    onSuccess: (_res, variables) => {
      // Instantly patch known text/status fields in the capsule list cache
      const safeFields: Partial<ICapsule> = {};
      if (variables.title    !== undefined) (safeFields as any).title    = variables.title;
      if (variables.status   !== undefined) (safeFields as any).status   = variables.status;
      if (variables.schedule_date !== undefined) (safeFields as any).schedule_date = variables.schedule_date;

      const patcher = (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            docs: (page.docs ?? []).map((c: any) =>
              c._id === id ? { ...c, ...safeFields } : c
            ),
          })),
        };
      };
      queryClient.setQueriesData({ queryKey: ['capsules'] }, patcher);
      // Invalidate the individual capsule detail for full refresh
      queryClient.invalidateQueries({ queryKey: queryKeys.capsule(id) });
    },
  });
}

export function useDeleteCapsule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      del(endpoint.capsuleDelete.replace(':id', id)),
    onSuccess: (_res, id) => {
      // Instantly remove deleted capsule from list — no refetch
      const remover = (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            docs: (page.docs ?? []).filter((c: any) => c._id !== id),
          })),
        };
      };
      queryClient.setQueriesData({ queryKey: ['capsules'] }, remover);
      queryClient.invalidateQueries({ queryKey: queryKeys.capsuleStats });
    },
  });
}
