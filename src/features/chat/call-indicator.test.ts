import { describe, expect, test } from 'bun:test';
import { hasDynamicIsland, isCallLive, islandCapsuleFrame } from './call-indicator';

describe('isCallLive', () => {
  test('a call stops being live the moment it is hung up', () => {
    expect(isCallLive({ isConnected: true, isEnding: false })).toBe(true);
    expect(isCallLive({ isConnected: true, isEnding: true })).toBe(false);
    expect(isCallLive({ isConnected: false, isEnding: false })).toBe(false);
  });
});

describe('hasDynamicIsland', () => {
  test('only island iPhones', () => {
    expect(hasDynamicIsland('ios', 59)).toBe(true);
    expect(hasDynamicIsland('ios', 47)).toBe(false);
    expect(hasDynamicIsland('android', 59)).toBe(false);
  });
});

describe('islandCapsuleFrame', () => {
  test('wraps the island and stays clear of the status bar icons', () => {
    const frame = islandCapsuleFrame(59);
    expect(frame.top).toBe(7);
    expect(frame.width).toBeLessThanOrEqual(168);
  });
});
