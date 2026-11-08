import { describe, expect, test } from 'bun:test';
import {
  floatingCallRestX,
  floatingCallTuckX,
  floatingCallWidth,
  resolveFloatingCallRelease,
} from './floating-call-position';

const screen = { screenWidth: 393, width: floatingCallWidth(393), minY: 67, maxY: 700 };

describe('floating voice call position', () => {
  test('matches web width: min(375, screen - 32)', () => {
    expect(floatingCallWidth(393)).toBe(361);
    expect(floatingCallWidth(1024)).toBe(375);
  });

  test('stays 8px inside the screen when released normally, like web', () => {
    expect(resolveFloatingCallRelease({ ...screen, x: -20, y: 10, vx: 0 })).toEqual({ tuck: null, x: 8, y: 67 });
    expect(resolveFloatingCallRelease({ ...screen, x: 50, y: 900, vx: 0.2 })).toEqual({ tuck: null, x: 24, y: 700 });
  });

  test('tucks when pushed well past an edge', () => {
    expect(resolveFloatingCallRelease({ ...screen, x: 200, y: 100, vx: 0 }).tuck).toBe('right');
    expect(resolveFloatingCallRelease({ ...screen, x: -150, y: 100, vx: 0 }).tuck).toBe('left');
  });

  test('tucks on a sideways fling', () => {
    expect(resolveFloatingCallRelease({ ...screen, x: 16, y: 100, vx: 1.5 }).tuck).toBe('right');
    expect(resolveFloatingCallRelease({ ...screen, x: 16, y: 100, vx: -1.5 }).tuck).toBe('left');
  });

  test('tucks fully off screen and comes back against the same side', () => {
    expect(floatingCallTuckX('right', 393, 361)).toBe(401);
    expect(floatingCallTuckX('left', 393, 361)).toBe(-369);
    expect(floatingCallRestX('right', 393, 361)).toBe(16);
    expect(floatingCallRestX('left', 393, 361)).toBe(16);
  });

  test('island iPhones tuck into the Dynamic Island, also on an upward fling', () => {
    expect(resolveFloatingCallRelease({ ...screen, x: 200, y: 100, vx: 0, island: true }).tuck).toBe('island');
    expect(resolveFloatingCallRelease({ ...screen, x: 16, y: 100, vx: 0, vy: -1.5, island: true }).tuck).toBe('island');
    expect(resolveFloatingCallRelease({ ...screen, x: 16, y: 100, vx: 0, vy: -1.5 }).tuck).toBeNull();
    expect(resolveFloatingCallRelease({ ...screen, x: 16, y: 100, vx: 0.2, island: true }).tuck).toBeNull();
  });
});
