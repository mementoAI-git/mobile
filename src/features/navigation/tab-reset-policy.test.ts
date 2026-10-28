// @ts-nocheck
import {describe, expect, test} from 'bun:test';
import {shouldPopTabToTopOnBlur, getTabEntryParams} from './tab-reset-policy';

describe('tab reset policy', () => {
  test('returns Explore to its category list after leaving the tab', () => {
    expect(shouldPopTabToTopOnBlur('explore')).toBe(true);
  });

  test('returns Stories to its list after leaving the tab', () => {
    expect(shouldPopTabToTopOnBlur('stories')).toBe(true);
  });

  test('does not change the existing state policy for other tabs', () => {
    expect(shouldPopTabToTopOnBlur('overview')).toBe(false);
    expect(shouldPopTabToTopOnBlur('chat')).toBe(false);
  });
});

describe('tab entry destination', () => {
  test('opens the Stories list even when a direct story was the stack root', () => {
    expect(getTabEntryParams('stories')).toEqual({ screen: 'index' });
  });
  test('preserves the destination in other tabs', () => {
    expect(getTabEntryParams('chat')).toBeUndefined();
    expect(getTabEntryParams('overview')).toBeUndefined();
    expect(getTabEntryParams('explore')).toBeUndefined();
  });
});
