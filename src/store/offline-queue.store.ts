import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { toast } from '@/components/ui/Toast';
import { post, put, del } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryClient } from '@/lib/query-client';
import { logger } from '@/lib/logger';
import {
  enqueueOfflineMutation,
  dequeueOfflineMutation,
  type OfflineMutation,
  type OfflineMemoryPayload,
} from '@/features/memories/offline-queue-state';

export type { OfflineMutation, OfflineMemoryPayload };

interface OfflineQueueState {
  queue: OfflineMutation[];
  isSyncing: boolean;
  enqueueMutation: (
    type: OfflineMutation['type'],
    payload: OfflineMemoryPayload
  ) => Promise<void>;
  dequeueMutation: (id: string) => Promise<void>;
  loadQueue: () => Promise<void>;
  syncQueue: () => Promise<void>;
  clearQueue: () => Promise<void>;
}

const STORAGE_KEY = 'MEMENTO_OFFLINE_MUTATIONS';

export const useOfflineQueueStore = create<OfflineQueueState>((set, get) => ({
  queue: [],
  isSyncing: false,

  enqueueMutation: async (type, payload) => {
    const nextQueue = enqueueOfflineMutation(get().queue, type, payload);
    set({ queue: nextQueue });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextQueue));
    toast('Saved offline. Syncing automatically when back online.', 'info');
  },

  dequeueMutation: async (id) => {
    const nextQueue = dequeueOfflineMutation(get().queue, id);
    set({ queue: nextQueue });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextQueue));
  },

  loadQueue: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        set({ queue: JSON.parse(raw) });
      }
    } catch (err) {
      logger.error('Failed to load offline mutation queue:', err);
    }
  },

  clearQueue: async () => {
    set({ queue: [] });
    await AsyncStorage.removeItem(STORAGE_KEY);
  },

  syncQueue: async () => {
    const { queue, isSyncing } = get();
    if (isSyncing || queue.length === 0) return;

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return;

    set({ isSyncing: true });
    toast('Syncing offline updates...', 'info');

    const items = [...queue];
    for (const item of items) {
      try {
        if (item.type === 'create_memory') {
          await post(endpoint.memories, item.payload);
        } else if (item.type === 'update_memory') {
          const { id: memoryId, ...payload } = item.payload;
          if (memoryId && !memoryId.startsWith('offline-')) {
            await put(endpoint.memory.replace(':id', memoryId), payload);
          }
        } else if (item.type === 'delete_memory') {
          const { id: memoryId } = item.payload;
          if (memoryId && !memoryId.startsWith('offline-')) {
            await del(endpoint.memory.replace(':id', memoryId));
          }
        }
        await get().dequeueMutation(item.id);
      } catch (err: any) {
        logger.error(`Offline sync failed for mutation ${item.id}:`, err);
        const status = err?.httpStatus ?? err?.status ?? err?.response?.status;
        if (typeof status === 'number' && status >= 400 && status < 500) {
          await get().dequeueMutation(item.id);
        } else {
          break;
        }
      }
    }

    set({ isSyncing: false });
    queryClient.invalidateQueries();
    toast('Offline sync complete!', 'success');
  },
}));

