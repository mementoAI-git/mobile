import { describe, expect, test } from 'bun:test';
import { resolveTabSwipeTarget } from '@/lib/tab-swipe';

describe('tab swipe navigation', () => {
  test('moves to the next tab on a left swipe past the threshold', () => {
    expect(resolveTabSwipeTarget(0, 5, -100)).toBe(1);
  });

  test('moves to the previous tab on a right swipe past the threshold', () => {
    expect(resolveTabSwipeTarget(2, 5, 100)).toBe(1);
  });

  test('ignores small drags beneath the threshold', () => {
    expect(resolveTabSwipeTarget(2, 5, 30)).toBeNull();
  });

  test('clamps at the first or last tab boundary', () => {
    expect(resolveTabSwipeTarget(0, 5, 120)).toBeNull();
    expect(resolveTabSwipeTarget(4, 5, -120)).toBeNull();
  });
});
