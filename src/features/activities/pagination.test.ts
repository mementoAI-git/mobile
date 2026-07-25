// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { getNextActivitiesPage } from './pagination';

describe('activities pagination', () => {
  test('returns the next numeric page when more activity exists', () => {
    expect(getNextActivitiesPage({ hasNextPage: true, page: 2 })).toBe(3);
  });

  test('stops pagination after the final page', () => {
    expect(getNextActivitiesPage({ hasNextPage: false, page: 2 })).toBeUndefined();
  });
});
