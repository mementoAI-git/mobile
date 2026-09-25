import { describe, expect, test, mock } from 'bun:test';

mock.module('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: mock(async () => null),
    setItem: mock(async () => {}),
    removeItem: mock(async () => {}),
  },
}));

describe('QueryClient Retry Policy', () => {
  test('does not retry 401 Unauthorized errors and allows transient retries', async () => {
    const { queryClient } = await import('./query-client');
    const defaultRetry = queryClient.getDefaultOptions().queries?.retry;

    expect(typeof defaultRetry).toBe('function');

    if (typeof defaultRetry === 'function') {
      expect(defaultRetry(0, { status: 401 } as any)).toBe(false);
      expect(defaultRetry(0, { response: { status: 401 } } as any)).toBe(false);
      expect(defaultRetry(0, { status: 403 } as any)).toBe(false);
      expect(defaultRetry(0, { status: 500 } as any)).toBe(true);
      expect(defaultRetry(1, { status: 500 } as any)).toBe(false);
    }
  });
});
