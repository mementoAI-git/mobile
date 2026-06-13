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
  /** Client-only: populated attachment objects used for cache patching.
   *  Stripped before sending to the server. */
  _clientAttachments?: Array<{ _id: string; url: string; type: string; name: string }>;
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
    mutationFn: (payload: Partial<CreateMemoryPayload>) => {
      // Strip client-only fields before sending to server
      const { _clientAttachments: _stripped, ...serverPayload } = payload;
      return put<IMemory>(endpoint.memory.replace(':id', id), serverPayload);
    },
    onSuccess: (_response, variables) => {
      // The server's PUT response returns the PRE-update document (MongoDB default).
      // We use `variables` (what we sent) to instantly patch TEXT fields only.
      // Attachments are deliberately NOT patched here — the local file URI from
      // the image picker renders blank as a thumbnail. The server refetch below
      // returns proper CDN URLs which the card will render correctly.
      const safeFields: Partial<IMemory> = {};
      if (variables.title  !== undefined) safeFields.title  = variables.title;
      if (variables.body   !== undefined) safeFields.body   = variables.body;
      if (variables.tags   !== undefined) safeFields.tags   = variables.tags;
      if (variables.status !== undefined) safeFields.status = variables.status;

      // 1. Patch text fields instantly — title updates before the network round-trip.
      const textPatcher = (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            docs: (page.docs ?? []).map((s: any) =>
              s._id === id ? { ...s, ...safeFields } : s
            ),
          })),
        };
      };
      queryClient.setQueriesData({ queryKey: ['stories'] }, textPatcher);
      queryClient.setQueriesData({ queryKey: ['memories'] }, textPatcher);

      // 2. Immediately re-fetch the stories list from the server.
      //    This returns proper CDN URLs for attachments, updating thumbnails correctly.
      //    refetchType: 'all' fires even for inactive/unmounted queries.
      queryClient.invalidateQueries({ queryKey: ['stories'], refetchType: 'all' });

      // 3. Silently invalidate the individual memory for the detail screen.
      queryClient.invalidateQueries({ queryKey: queryKeys.memory(id) });
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
