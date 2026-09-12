import { describe, expect, test } from 'bun:test';
import {
  getManagePlanProCardImageStyle,
  getManagePlanProCardStyle,
} from './manage-plan-layout';

describe('manage plan card layout', () => {
  test('keeps the gradient card separated, padded, rounded, and clipped', () => {
    expect(getManagePlanProCardStyle()).toEqual({
      alignSelf: 'stretch',
      marginTop: 24,
      borderRadius: 32,
      paddingHorizontal: 24,
      paddingVertical: 28,
      overflow: 'hidden',
    });
  });

  test('clips the supplied Pro artwork to the card radius', () => {
    expect(getManagePlanProCardImageStyle()).toEqual({borderRadius: 32});
  });
});
