import { describe, expect, test } from 'bun:test';
import { canSwipeOpenMenu, shouldOpenMenuFromSwipe } from './menu-swipe';

describe('left-edge menu swipe', () => {
  test('is available on base pages only', () => {
    for (const path of ['/overview', '/chat', '/stories', '/explore', '/capsule', '/account', '/settings']) {
      expect(canSwipeOpenMenu(path, false, null)).toBe(true);
    }
    for (const path of ['/chat/123', '/stories/123', '/explore/family', '/settings/security', '/login', '/onboarding', '/']) {
      expect(canSwipeOpenMenu(path, false, null)).toBe(false);
    }
  });

  test('does not compete with an open menu or bottom sheet', () => {
    expect(canSwipeOpenMenu('/overview', true, null)).toBe(false);
    expect(canSwipeOpenMenu('/overview', false, 'search-memory')).toBe(false);
  });

  test('opens on a deliberate rightward swipe or short quick flick', () => {
    expect(shouldOpenMenuFromSwipe(64, 8, 100)).toBe(true);
    expect(shouldOpenMenuFromSwipe(24, 3, 650)).toBe(true);
  });

  test('ignores leftward, vertical, accidental, and reversed swipes', () => {
    expect(shouldOpenMenuFromSwipe(-80, 0, -700)).toBe(false);
    expect(shouldOpenMenuFromSwipe(20, 70, 700)).toBe(false);
    expect(shouldOpenMenuFromSwipe(12, 0, 700)).toBe(false);
    expect(shouldOpenMenuFromSwipe(24, 0, 100)).toBe(false);
    expect(shouldOpenMenuFromSwipe(80, 0, -600)).toBe(false);
  });
});
