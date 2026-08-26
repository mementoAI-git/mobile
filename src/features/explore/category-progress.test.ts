// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { formatCategoryProgress } from './category-progress';

describe('category progress formatting', () => {
  test('returns null when total is 0 or negative', () => {
    expect(formatCategoryProgress(0, 0)).toBeNull();
    expect(formatCategoryProgress(5, -1)).toBeNull();
  });

  test('formats in-progress categories correctly', () => {
    const progress = formatCategoryProgress(3, 10);
    expect(progress).not.toBeNull();
    expect(progress?.answered).toBe(3);
    expect(progress?.total).toBe(10);
    expect(progress?.percent).toBe(30);
    expect(progress?.label).toBe('3 of 10 answered');
    expect(progress?.isComplete).toBe(false);
  });

  test('formats completed category with completion label', () => {
    const progress = formatCategoryProgress(10, 10);
    expect(progress).not.toBeNull();
    expect(progress?.percent).toBe(100);
    expect(progress?.label).toBe('Chapter complete');
    expect(progress?.isComplete).toBe(true);
  });

  test('formats untouched category with total prompts', () => {
    const progress = formatCategoryProgress(0, 8);
    expect(progress).not.toBeNull();
    expect(progress?.percent).toBe(0);
    expect(progress?.label).toBe('8 prompts');
    expect(progress?.isComplete).toBe(false);
  });
});
