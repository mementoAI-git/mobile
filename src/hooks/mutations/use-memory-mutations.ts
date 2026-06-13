import { useMutation, useQueryClient } from '@tanstack/react-query';
import { post, put, del } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import type { IMemory, IDailyPromptCapture } from '@/types';

interface CreateMemoryPayload {
  title: string;
  body: string;
  tags?: string[];
  status?: 'draft' | 'save' | string;
  level?: number;
  attachments?: string[];
  groups?: string[];
  beneficiaries?: string[];
  daily_prompt?: IDailyPromptCapture;
}

export function useCreateMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMemoryPayload) =>
      post<IMemory>(endpoint.memories, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.memoriesStats });
    },
  });
}

export function useUpdateMemory(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<CreateMemoryPayload>) =>
      put<IMemory>(endpoint.memory.replace(':id', id), payload),
    onSuccess: () => {
      // Invalidate the individual memory so detail screen re-fetches
      queryClient.invalidateQueries({ queryKey: queryKeys.memory(id) });
      // Force-refetch the stories/memories list immediately so card thumbnails
      // update without requiring an app restart or tab re-focus.
      queryClient.refetchQueries({ queryKey: ['memories'] });
      queryClient.refetchQueries({ queryKey: ['stories'] });
    },
  });
}

export function useDeleteMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      del(endpoint.memory.replace(':id', id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.memoriesStats });
    },
  });
}

export function useRestoreMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      post(endpoint.restoreMemory.replace(':id', id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.memoriesStats });
    },
  });
}

export function useBookmarkMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, bookmarked }: { id: string; bookmarked: boolean }) =>
      bookmarked
        ? del(endpoint.bookmarkMemory.replace(':id', id))
        : post(endpoint.bookmarkMemory.replace(':id', id)),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.memory(vars.id) });
    },
  });
}

export function useAddMessage() {
  return useMutation({
    mutationFn: (payload: {
      messages: { text: string; role: string; is_voice?: boolean }[];
      memory_id?: string;
      session_id?: string;
    }) => post<any>(endpoint.addMessageToMemory, payload),
  });
}

export function useStartConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload?: { prompt_id?: string; text?: string }) =>
      post<any>(endpoint.startConversation, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
