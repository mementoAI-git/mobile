import type { MemoryMutationPayload } from '@/features/memories/memory-mutation-payload';

export interface OfflineMutationBase {
  id: string;
  createdAt: string;
}

export type OfflineMutation = OfflineMutationBase &
  (
    | { type: 'create_memory'; payload: MemoryMutationPayload & { _offlineId?: string } }
    | {
        type: 'update_memory';
        payload: { id: string } & Partial<MemoryMutationPayload>;
      }
    | {
        type: 'delete_memory';
        payload: { id: string };
      }
  );

export type OfflineMemoryPayload = OfflineMutation['payload'];

/**
 * Pure function to enqueue a mutation into the offline queue.
 * If deleting an uncommitted offline item (id starting with "offline-"),
 * any pending create/update mutations for that item are pruned immediately,
 * and the delete mutation itself is not enqueued (since the server never saw it).
 */
export function enqueueOfflineMutation(
  queue: OfflineMutation[],
  type: OfflineMutation['type'],
  payload: OfflineMemoryPayload,
): OfflineMutation[] {
  if (type === 'delete_memory') {
    const targetId = (payload as { id: string }).id;
    if (targetId && targetId.startsWith('offline-')) {
      return queue.filter((item) => {
        if (item.type === 'create_memory') {
          return (item.payload as any)._offlineId !== targetId;
        }
        if (item.type === 'update_memory' || item.type === 'delete_memory') {
          return (item.payload as any).id !== targetId;
        }
        return true;
      });
    }
  }

  const newMutation: OfflineMutation = {
    id: `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    type,
    payload,
    createdAt: new Date().toISOString(),
  } as OfflineMutation;

  return [...queue, newMutation];
}

/**
 * Pure function to remove an item from the offline queue.
 */
export function dequeueOfflineMutation(
  queue: OfflineMutation[],
  mutationId: string,
): OfflineMutation[] {
  return queue.filter((item) => item.id !== mutationId);
}
