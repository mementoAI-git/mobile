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

import { generatedTitlePollInterval, isAwaitingGeneratedTitle } from './query-options';

describe('generated title polling', () => {
  const now = Date.parse('2026-11-11T12:00:00Z');
  const pending = { enrichment_status: 'pending', capture_source: 'quick', updated_at: '2026-11-11T11:59:30Z' };

  test('polls while a fresh untitled save waits for its title', () => {
    expect(isAwaitingGeneratedTitle(pending, now)).toBe(true);
    expect(generatedTitlePollInterval([pending], now)).toBe(4000);
  });

  test('stops for titled stories, finished jobs and stale pending jobs', () => {
    expect(generatedTitlePollInterval([{ ...pending, capture_source: 'standard' }], now)).toBe(false);
    expect(generatedTitlePollInterval([{ ...pending, enrichment_status: 'complete' }], now)).toBe(false);
    expect(generatedTitlePollInterval([{ ...pending, updated_at: '2026-11-11T11:50:00Z' }], now)).toBe(false);
    expect(generatedTitlePollInterval([undefined], now)).toBe(false);
  });
});
