// @ts-nocheck
import {describe, expect, test} from 'bun:test';
import {shouldPopTabToTopOnBlur} from './tab-reset-policy';

describe('tab reset policy', () => {
  test('returns Explore to its category list after leaving the tab', () => {
    expect(shouldPopTabToTopOnBlur('explore')).toBe(true);
  });

  test('does not change the existing state policy for other tabs', () => {
    expect(shouldPopTabToTopOnBlur('overview')).toBe(false);
    expect(shouldPopTabToTopOnBlur('chat')).toBe(false);
    expect(shouldPopTabToTopOnBlur('stories')).toBe(false);
  });
});
