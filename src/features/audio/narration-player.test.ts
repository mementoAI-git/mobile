// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import {
  formatNarrationTime,
  calculateNarrationProgress,
  getNextPlaybackSpeed,
} from './narration-player';

describe('narration player helpers', () => {
  test('formats seconds into mm:ss time display', () => {
    expect(formatNarrationTime(0)).toBe('0:00');
    expect(formatNarrationTime(42)).toBe('0:42');
    expect(formatNarrationTime(125)).toBe('2:05');
    expect(formatNarrationTime(3600)).toBe('60:00');
  });

  test('calculates playback progress percentages safely', () => {
    expect(calculateNarrationProgress(0, 100)).toBe(0);
    expect(calculateNarrationProgress(50, 100)).toBe(50);
    expect(calculateNarrationProgress(100, 100)).toBe(100);
    expect(calculateNarrationProgress(150, 100)).toBe(100);
    expect(calculateNarrationProgress(50, 0)).toBe(0);
    expect(calculateNarrationProgress(-10, 100)).toBe(0);
  });

  test('cycles playback speeds in order 1.0 -> 1.25 -> 1.5 -> 1.0', () => {
    expect(getNextPlaybackSpeed(1.0)).toBe(1.25);
    expect(getNextPlaybackSpeed(1.25)).toBe(1.5);
    expect(getNextPlaybackSpeed(1.5)).toBe(1.0);
  });
});
