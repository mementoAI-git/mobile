import { describe, expect, test } from 'bun:test';

import { VOICE_TOKEN_PREFETCH_MAX_AGE_MS, VoiceTokenPrefetch } from './voice-token-prefetch';

function setup() {
  const clock = { now: 0 };
  const fetches: string[] = [];
  const results = new Map<string, Promise<unknown>>();
  const tokens = new VoiceTokenPrefetch(() => clock.now);
  const prefetch = {
    prefetch: (key: string) =>
      tokens.prefetch(key, () => {
        fetches.push(key);
        return results.get(key) ?? Promise.resolve({ token: key });
      }),
    take: (key: string) => tokens.take(key),
    clear: () => tokens.clear(),
  };
  return { clock, fetches, results, prefetch };
}

describe('VoiceTokenPrefetch', () => {
  test('hands a prefetched token to the next call with the same key, once', async () => {
    const { fetches, prefetch } = setup();

    prefetch.prefetch('user|memory|Fenrir');
    prefetch.prefetch('user|memory|Fenrir');

    expect(fetches).toEqual(['user|memory|Fenrir']);
    expect(await prefetch.take('user|memory|Fenrir')).toEqual({ token: 'user|memory|Fenrir' });
    expect(prefetch.take('user|memory|Fenrir')).toBeUndefined();
  });

  test('drops a token prefetched for a different conversation or voice', () => {
    const { prefetch } = setup();

    prefetch.prefetch('user|memory-a|Fenrir');

    expect(prefetch.take('user|memory-b|Fenrir')).toBeUndefined();
    expect(prefetch.take('user|memory-a|Fenrir')).toBeUndefined();
  });

  test('replaces a prefetch when the key changes', () => {
    const { fetches, prefetch } = setup();

    prefetch.prefetch('user|memory|Fenrir');
    prefetch.prefetch('user|memory|Puck');

    expect(fetches).toEqual(['user|memory|Fenrir', 'user|memory|Puck']);
    expect(prefetch.take('user|memory|Puck')).toBeDefined();
  });

  test('refetches once the token is too old for its memory context', () => {
    const { clock, fetches, prefetch } = setup();

    prefetch.prefetch('key');
    clock.now = VOICE_TOKEN_PREFETCH_MAX_AGE_MS + 1;
    expect(prefetch.take('key')).toBeUndefined();

    prefetch.prefetch('key');
    expect(fetches).toEqual(['key', 'key']);
  });

  test('forgets a failed prefetch so the next attempt fetches again', async () => {
    const { fetches, results, prefetch } = setup();
    results.set('key', Promise.reject(new Error('offline')));

    prefetch.prefetch('key');
    await Promise.resolve();
    await Promise.resolve();
    results.delete('key');
    prefetch.prefetch('key');

    expect(fetches).toEqual(['key', 'key']);
    expect(await prefetch.take('key')).toEqual({ token: 'key' });
  });

  test('clear drops any prefetched token', () => {
    const { prefetch } = setup();
    prefetch.prefetch('key');
    prefetch.clear();
    expect(prefetch.take('key')).toBeUndefined();
  });
});
