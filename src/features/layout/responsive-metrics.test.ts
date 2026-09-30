import { describe, expect, test } from 'bun:test';
import {
  contentMaxWidth,
  hs,
  iconSize,
  minTouchTarget,
  ms,
  mvs,
  radius,
  responsiveSpace,
  screenGutter,
  vs,
} from '@/constants/responsive';

describe('responsive metrics', () => {
  test('exports numeric scaling helpers', () => {
    expect(typeof hs(10)).toBe('number');
    expect(typeof vs(10)).toBe('number');
    expect(typeof ms(10)).toBe('number');
    expect(typeof mvs(10)).toBe('number');
    expect(typeof iconSize(24)).toBe('number');
    expect(typeof radius(16)).toBe('number');
    expect(typeof responsiveSpace(16)).toBe('number');
  });

  test('never shrinks a touch target below 44', () => {
    expect(minTouchTarget(32)).toBeGreaterThanOrEqual(44);
    expect(minTouchTarget()).toBeGreaterThanOrEqual(44);
  });

  test('caps gutters and reading width on tablets', () => {
    expect(screenGutter(320)).toBeLessThanOrEqual(20);
    expect(screenGutter(1024)).toBeLessThanOrEqual(32);
    expect(contentMaxWidth(1024)).toBeLessThanOrEqual(720);
    expect(contentMaxWidth(320)).toBe(320);
  });
});
