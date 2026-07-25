// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { filesQueryKey, filesRequestUrl } from './query-options';

describe('files query options', () => {
  test('uses the limit in a stable query key', () => {
    expect(filesQueryKey(10)).toEqual(['files', { limit: 10 }]);
    expect(filesQueryKey(100)).not.toEqual(filesQueryKey(10));
  });

  test('uses the limit in the files request URL', () => {
    expect(filesRequestUrl('/files', 100)).toBe('/files?limit=100');
  });
});
