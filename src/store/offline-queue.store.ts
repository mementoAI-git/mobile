import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { toast } from '@/components/ui/Toast';
import { post, put } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryClient } from '@/lib/query-client';
import { logger } from '@/lib/logger';

export interface OfflineMutation {
  id: string;
  type: 'create_memory' | 'update_memory';
  payload: any;
  createdAt: string;
}

interface OfflineQueueState {
  queue: OfflineMutation[];
  isSyncing: boolean;
  enqueueMutation: (type: OfflineMutation['type'], payload: any) => Promise<void>;
  dequeueMutation: (id: string) => Promise<void>;
  loadQueue: () => Promise<void>;
  syncQueue: () => Promise<void>;
}

const STORAGE_KEY = 'MEMENTO_OFFLINE_MUTATIONS';

export const useOfflineQueueStore = create<OfflineQueueState>((set, get) => ({
  queue: [],
  isSyncing: false,

  enqueueMutation: async (type, payload) => {
    const newMutation: OfflineMutation = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      type,
      payload,
      createdAt: new Date().toISOString(),
    };

    const nextQueue = [...get().queue, newMutation];
    set({ queue: nextQueue });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextQueue));
    toast('Saved offline. Syncing automatically when back online.', 'info');
  },

  dequeueMutation: async (id) => {
    const nextQueue = get().queue.filter((item) => item.id !== id);
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
          if (memoryId) {
            await put(endpoint.memory.replace(':id', memoryId), payload);
          }
        }
        await get().dequeueMutation(item.id);
      } catch (err: any) {
        logger.error(`Offline sync failed for mutation ${item.id}:`, err);
        if (err?.response?.status >= 400 && err?.response?.status < 500) {
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
