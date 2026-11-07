import { expect, test } from 'bun:test';
import { createToastQueue } from './toast-queue';

test('screen and modal viewports observe the same error once', () => {
  const expire: (() => void)[] = [];
  const queue = createToastQueue((callback, duration) => { expect(duration).toBe(3500); expire.push(callback); });
  const root: unknown[] = [], modal: unknown[] = [];
  queue.subscribe(() => root.push(queue.getSnapshot()));
  const unsubscribeModal = queue.subscribe(() => modal.push(queue.getSnapshot()));
  queue.add('Could not save media', 'error');
  expect(root[0]).toBe(modal[0]);
  expect(queue.getSnapshot()).toMatchObject([{ message: 'Could not save media', type: 'error' }]);
  unsubscribeModal();
  expire[0]();
  expect(queue.getSnapshot()).toEqual([]);
  expect(root).toHaveLength(2);
  expect(modal).toHaveLength(1);
});

test('messages retain order, unique IDs and independent expiration', () => {
  const expire: (() => void)[] = [];
  const queue = createToastQueue(callback => { expire.push(callback); });
  queue.add('First', 'error');
  queue.add('Second', 'info');
  queue.add('Third', 'success');
  const snapshot = queue.getSnapshot();
  expect(new Set(snapshot.map(item => item.id)).size).toBe(3);
  expect(snapshot.map(item => item.message)).toEqual(['First', 'Second', 'Third']);
  expire[1]();
  expect(queue.getSnapshot().map(item => item.message)).toEqual(['First', 'Third']);
  expect(snapshot).toHaveLength(3);
});

test('messages queued before a viewport mounts are available immediately', () => {
  const queue = createToastQueue(() => {});
  queue.add('Connection interrupted');
  expect(queue.getSnapshot()).toMatchObject([{ message: 'Connection interrupted', type: 'info' }]);
});
