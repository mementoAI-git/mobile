import {describe, expect, test} from 'bun:test';
import {getBillingLayout} from './billing-layout';

describe('billing responsive layout', () => {
  test('matches the 393-point reference canvas', () => {
    expect(getBillingLayout(393)).toEqual({
      horizontalPadding: 16,
      contentWidth: 361,
      freeBannerHeight: 96,
      paidBannerHeight: 142,
      storageHeight: 85,
      tabHeight: 32,
    });
  });

  test('keeps cards inside a narrow viewport', () => {
    expect(getBillingLayout(320).contentWidth).toBe(288);
  });
});
