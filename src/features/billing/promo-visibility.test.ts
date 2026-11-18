import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { canRedeemPromoCode } from './promo-visibility';

describe('promo code visibility', () => {
  test('is hidden on iOS and shown elsewhere', () => {
    expect(canRedeemPromoCode('ios')).toBe(false);
    expect(canRedeemPromoCode('android')).toBe(true);
    expect(canRedeemPromoCode('web')).toBe(true);
  });

  test('the billing screen gates the promo card on the rule', () => {
    const screen = readFileSync('app/settings/billing.tsx', 'utf8');
    expect(screen).toContain("activeTab === 'overview' && canRedeemPromoCode(Platform.OS)");
  });
});
