import { describe, expect, test } from 'bun:test';

import { persistedQueryPrefixes, shouldPersistQuery } from './query-persistence';

describe('shouldPersistQuery', () => {
  test('saves small account and home-screen queries', () => {
    expect(shouldPersistQuery(['profile'])).toBe(true);
    expect(shouldPersistQuery(['user-stats'])).toBe(true);
    expect(shouldPersistQuery(['daily-prompts', '2026-10-01'])).toBe(true);
    expect(shouldPersistQuery(['memories', { limit: 50 }])).toBe(true);
  });

  test('never saves chat messages, paged lists or other memory queries', () => {
    expect(shouldPersistQuery(['prompt-messages', 'abc'])).toBe(false);
    expect(shouldPersistQuery(['stories', { limit: 50 }])).toBe(false);
    expect(shouldPersistQuery(['memories', { limit: 20 }])).toBe(false);
    expect(shouldPersistQuery(['memories', { limit: 50, search: 'farm' }])).toBe(false);
    expect(shouldPersistQuery(['memory', 'abc'])).toBe(false);
    expect(shouldPersistQuery([42])).toBe(false);
  });

  test('every persisted prefix is itself persisted', () => {
    for (const prefix of persistedQueryPrefixes()) {
      expect(shouldPersistQuery(prefix)).toBe(true);
    }
  });
});
