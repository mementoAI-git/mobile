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
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.memoriesStats });
      if (variables.daily_prompt?.prompt_id || variables.daily_prompt?.pinned_text || variables.daily_prompt?.reflection_day_key) {
        queryClient.invalidateQueries({ queryKey: queryKeys.dailyPrompts() });
        queryClient.invalidateQueries({ queryKey: queryKeys.categoryDetailsPrompts() });
        queryClient.invalidateQueries({ queryKey: queryKeys.overviewPrompts });
        queryClient.invalidateQueries({ queryKey: queryKeys.prompts() });
      }
      if (variables.daily_prompt?.prompt_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.memoryByPrompt(variables.daily_prompt.prompt_id) });
      }
    },
  });
}

export function useUpdateMemory(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<CreateMemoryPayload>) =>
      put<IMemory>(endpoint.memory.replace(':id', id), payload),
    onSuccess: (_response, variables) => {
      // Server PUT returns the PRE-update document (MongoDB { new: false } default).
      // Patch text fields instantly from variables — no network call needed.
      const safeFields: Partial<IMemory> = {};
      if (variables.title  !== undefined) safeFields.title  = variables.title;
      if (variables.body   !== undefined) safeFields.body   = variables.body;
      if (variables.tags   !== undefined) safeFields.tags   = variables.tags;
      if (variables.status !== undefined) safeFields.status = variables.status;

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

      // Silently invalidate the individual memory for the detail screen.
      // The MasonryMemoryGrid key change handles thumbnail updates on the card.
      queryClient.invalidateQueries({ queryKey: queryKeys.memory(id) });
    },
  });
}

export function useDeleteMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      del(endpoint.memory.replace(':id', id)),
    onSuccess: (_res, id) => {
      // Instantly remove the deleted item from all list caches — no refetch needed.
      const remover = (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            docs: (page.docs ?? []).filter((s: any) => s._id !== id),
          })),
        };
      };
      queryClient.setQueriesData({ queryKey: ['stories'] }, remover);
      queryClient.setQueriesData({ queryKey: ['memories'] }, remover);
      // Stats counter needs a server refetch since we can't decrement it locally
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
      // Instantly flip bookmarked state in both list caches and detail cache.
      // `vars.bookmarked` is the OLD state — the new state is the opposite.
      const newBookmarked = !vars.bookmarked;
      const flipper = (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            docs: (page.docs ?? []).map((s: any) =>
              s._id === vars.id ? { ...s, bookmarked: newBookmarked } : s
            ),
          })),
        };
      };
      queryClient.setQueriesData({ queryKey: ['stories'] }, flipper);
      queryClient.setQueriesData({ queryKey: ['memories'] }, flipper);
      // Also patch the individual memory detail cache
      queryClient.setQueryData(queryKeys.memory(vars.id), (old: any) =>
        old ? { ...old, bookmarked: newBookmarked } : old
      );
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
