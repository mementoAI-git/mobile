import {describe, expect, test} from 'bun:test';
import {
  getSheetBottomPadding,
  getSheetTopInset,
} from './sheet-safe-area';

describe('sheet safe-area layout', () => {
  test('keeps designed footer spacing outside the device bottom inset', () => {
    expect(getSheetBottomPadding(34, 12)).toBe(46);
    expect(getSheetBottomPadding(0, 20)).toBe(20);
    expect(getSheetBottomPadding(-4, 16)).toBe(16);
  });

  test('never sends a negative top inset to a sheet container', () => {
    expect(getSheetTopInset(59)).toBe(59);
    expect(getSheetTopInset(0)).toBe(0);
    expect(getSheetTopInset(-8)).toBe(0);
  });
});
