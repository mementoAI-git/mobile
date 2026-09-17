// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import {
  enqueueOfflineMutation,
  dequeueOfflineMutation,
  type OfflineMutation,
} from './offline-queue-state';

describe('offline queue state management', () => {
  test('enqueues create, update, and delete mutations cleanly', () => {
    let queue: OfflineMutation[] = [];

    queue = enqueueOfflineMutation(queue, 'create_memory', {
      title: 'Offline note',
      body: 'Content',
    } as any);

    expect(queue).toHaveLength(1);
    expect(queue[0].type).toBe('create_memory');
    expect(queue[0].payload.title).toBe('Offline note');

    queue = enqueueOfflineMutation(queue, 'update_memory', {
      id: 'mem-1',
      title: 'Updated title',
    } as any);

    expect(queue).toHaveLength(2);
    expect(queue[1].type).toBe('update_memory');

    queue = enqueueOfflineMutation(queue, 'delete_memory', {
      id: 'mem-2',
    });

    expect(queue).toHaveLength(3);
    expect(queue[2].type).toBe('delete_memory');
  });

  test('prunes pending offline creations and updates when deleting an offline-only item', () => {
    let queue: OfflineMutation[] = [];
    const offlineId = 'offline-12345';

    queue = enqueueOfflineMutation(queue, 'create_memory', {
      _offlineId: offlineId,
      title: 'Never synced note',
    } as any);

    queue = enqueueOfflineMutation(queue, 'update_memory', {
      id: offlineId,
      title: 'Never synced update',
    } as any);

    expect(queue).toHaveLength(2);

    // Deleting the uncommitted offline ID should eliminate pending creations/updates and not append delete
    queue = enqueueOfflineMutation(queue, 'delete_memory', {
      id: offlineId,
    });

    expect(queue).toHaveLength(0);
  });

  test('dequeues processed mutation by ID', () => {
    let queue: OfflineMutation[] = [];

    queue = enqueueOfflineMutation(queue, 'create_memory', {
      title: 'Note 1',
    } as any);

    const firstId = queue[0].id;

    queue = enqueueOfflineMutation(queue, 'create_memory', {
      title: 'Note 2',
    } as any);

    expect(queue).toHaveLength(2);

    queue = dequeueOfflineMutation(queue, firstId);

    expect(queue).toHaveLength(1);
    expect(queue[0].id).not.toBe(firstId);
  });
});
