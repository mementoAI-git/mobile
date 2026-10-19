import { useMutation, useQueryClient } from '@tanstack/react-query';
import { post, put, del } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { invalidateMemoryQueries } from '@/features/memories/cache';
import { queryKeys } from '@/constants/query-keys';
import type { IMemory } from '@/types';
import {
  serializeMemoryMutationPayload,
  type MemoryMutationPayload,
} from '@/features/memories/memory-mutation-payload';
import NetInfo from '@react-native-community/netinfo';
import { useOfflineQueueStore } from '@/store/offline-queue.store';

export function useCreateMemory() {
  const queryClient = useQueryClient();
  const enqueueMutation = useOfflineQueueStore((s) => s.enqueueMutation);

  return useMutation({
    mutationFn: async (payload: MemoryMutationPayload) => {
      const serializedPayload = serializeMemoryMutationPayload(payload);
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        const offlineId = `offline-${Date.now()}`;
        await enqueueMutation('create_memory', { ...serializedPayload, _offlineId: offlineId });
        return {
          data: {
            _id: offlineId,
            title: payload.title,
            capture_source: payload.capture_source,
            body: payload.body,
            tags: payload.tags || [],
            status: payload.status || 'save',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as any,
        };
      }
      return post<IMemory>(endpoint.memories, serializedPayload);
    },
    onSuccess: (res, variables) => {
      const createdMemory = (res as any)?.data;
      if (createdMemory) {
        const injector = (old: any) => {
          if (!old?.pages || old.pages.length === 0) return old;
          const firstPage = old.pages[0];
          return {
            ...old,
            pages: [
              {
                ...firstPage,
                docs: [createdMemory, ...(firstPage.docs ?? [])],
              },
              ...old.pages.slice(1),
            ],
          };
        };
        queryClient.setQueriesData({ queryKey: [queryKeys.stories()[0]] }, injector);
        queryClient.setQueriesData({ queryKey: [queryKeys.memories()[0]] }, injector);
      }
      invalidateMemoryQueries(queryClient, {
        promptId: variables.daily_prompt?.prompt_id,
        promptText: variables.daily_prompt?.pinned_text,
        reflectionDayKey: variables.daily_prompt?.reflection_day_key,
      });
    },
  });
}

export function useUpdateMemory(id: string) {
  const queryClient = useQueryClient();
  const enqueueMutation = useOfflineQueueStore((s) => s.enqueueMutation);

  return useMutation({
    mutationFn: async (payload: Partial<MemoryMutationPayload>) => {
      const serializedPayload = serializeMemoryMutationPayload(payload);
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        await enqueueMutation('update_memory', { id, ...serializedPayload });
        return {
          data: {
            _id: id,
            ...serializedPayload,
            updated_at: new Date().toISOString(),
          } as any,
        };
      }
      return put<IMemory>(endpoint.memory.replace(':id', id), serializedPayload);
    },
    onSuccess: (_response, variables) => {
      // Server PUT returns the PRE-update document (MongoDB { new: false } default).
      // Patch text fields instantly from variables — no network call needed.
      const safeFields: Partial<IMemory> = {};
      if (variables.title  !== undefined) safeFields.title  = variables.title;
      if (variables.body   !== undefined) safeFields.body   = variables.body;
      if (variables.tags   !== undefined) safeFields.tags   = variables.tags;
      if (variables.status !== undefined) safeFields.status = variables.status;
      if (variables.capture_source !== undefined) safeFields.capture_source = variables.capture_source;

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
      queryClient.setQueriesData({ queryKey: [queryKeys.stories()[0]] }, textPatcher);
      queryClient.setQueriesData({ queryKey: [queryKeys.memories()[0]] }, textPatcher);

      // Silently invalidate the individual memory for the detail screen.
      // The MasonryMemoryGrid key change handles thumbnail updates on the card.
      invalidateMemoryQueries(queryClient, {
        memoryId: id,
        includeStats: false,
        promptId: variables.daily_prompt?.prompt_id,
        promptText: variables.daily_prompt?.pinned_text,
        reflectionDayKey: variables.daily_prompt?.reflection_day_key,
      });
    },
  });
}

export function useDeleteMemory() {
  const queryClient = useQueryClient();
  const enqueueMutation = useOfflineQueueStore((s) => s.enqueueMutation);

  return useMutation({
    mutationFn: async (id: string) => {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        await enqueueMutation('delete_memory', { id });
        return { data: { success: true, id } };
      }
      return del(endpoint.memory.replace(':id', id));
    },
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
      queryClient.setQueriesData({ queryKey: [queryKeys.stories()[0]] }, remover);
      // Invalidate list feeds and stats caches without refetching the deleted memory
      invalidateMemoryQueries(queryClient);
      // Remove individual memory query from cache so active views don't refetch a deleted entity
      queryClient.removeQueries({ queryKey: queryKeys.memory(id) });
    },
  });
}

export function useRemoveMemoryFile(memoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) => del(`${endpoint.removeFileFromMemory}/${fileId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.memory(memoryId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.promptMessages(memoryId) });
    },
  });
}

export function useRestoreMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      post(endpoint.restoreMemory.replace(':id', id)),
    onSuccess: () => {
      invalidateMemoryQueries(queryClient);
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
      queryClient.setQueriesData({ queryKey: [queryKeys.stories()[0]] }, flipper);
      queryClient.setQueriesData({ queryKey: [queryKeys.memories()[0]] }, flipper);
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
      queryClient.invalidateQueries({ queryKey: [queryKeys.conversations()[0]] });
    },
  });
}
