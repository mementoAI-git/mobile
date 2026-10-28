export type ToastType = 'success' | 'error' | 'info';
export interface ToastItem { id: string; message: string; type: ToastType }

/** One queue lets native modal windows render the same top notification stack. */
export function createToastQueue(schedule: (callback: () => void, duration: number) => unknown = setTimeout) {
  let items: ToastItem[] = [];
  let nextId = 0;
  const listeners = new Set<() => void>();
  const emit = () => { for (const listener of listeners) listener(); };
  return {
    getSnapshot: () => items,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    add(message: string, type: ToastType = 'info') {
      const id = String(++nextId);
      items = [...items, { id, message, type }];
      emit();
      schedule(() => {
        items = items.filter(item => item.id !== id);
        emit();
      }, 3500);
    },
  };
}

export const toastQueue = createToastQueue();
