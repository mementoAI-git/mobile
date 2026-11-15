// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { queryKeys } from '@/constants/query-keys';
import { getMemoryInvalidationQueryKeys } from './cache';

describe('memory cache invalidation', () => {
  test('invalidates list and stats caches for ordinary memory changes', () => {
    expect(getMemoryInvalidationQueryKeys()).toEqual([
      ['memories'],
      ['stories'],
      queryKeys.memoriesStats,
    ]);
  });

  test('adds detail and user stats keys when requested', () => {
    expect(getMemoryInvalidationQueryKeys({
      memoryId: 'memory-1',
      includeUserStats: true,
    })).toEqual([
      ['memories'],
      ['stories'],
      queryKeys.memoriesStats,
      queryKeys.userStats,
      queryKeys.memory('memory-1'),
    ]);
  });

  test('refreshes every open story when a server change names none', () => {
    // Voice and chat tools report "memories changed" without saying which,
    // so an open story must refetch instead of showing the old text.
    expect(getMemoryInvalidationQueryKeys({
      includeUserStats: true,
      includeAllStories: true,
    })).toEqual([
      ['memories'],
      ['stories'],
      queryKeys.memoriesStats,
      queryKeys.userStats,
      [queryKeys.memory('')[0]],
    ]);
  });

  test('can skip stats for edits that do not change counters', () => {
    expect(getMemoryInvalidationQueryKeys({
      memoryId: 'memory-1',
      includeStats: false,
    })).toEqual([
      ['memories'],
      ['stories'],
      queryKeys.memory('memory-1'),
    ]);
  });

  test('adds prompt caches for prompt-backed memories', () => {
    expect(getMemoryInvalidationQueryKeys({
      promptId: 'prompt-1',
      promptText: 'Tell me about summer',
      reflectionDayKey: '2026-07-07',
    })).toEqual([
      ['memories'],
      ['stories'],
      queryKeys.memoriesStats,
      queryKeys.dailyPrompts(),
      queryKeys.categoryDetailsPrompts(),
      queryKeys.overviewPrompts,
      queryKeys.prompts(),
      queryKeys.memoryByPrompt('prompt-1'),
    ]);
  });
});
