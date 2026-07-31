// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { shouldEnableStoriesQuery } from './query-options';

describe('stories query enablement', () => {
  test('keeps ordinary stories feeds enabled by default', () => {
    expect(shouldEnableStoriesQuery()).toBe(true);
  });

  test('allows consumers to disable an idle query explicitly', () => {
    expect(shouldEnableStoriesQuery(false)).toBe(false);
  });
});
