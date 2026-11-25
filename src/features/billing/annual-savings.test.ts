import { describe, expect, test } from 'bun:test';
import { annualSavingsPercent } from './annual-savings';

describe('annualSavingsPercent', () => {
  test('$9.99 a month against $94.99 a year saves 20%', () => {
    expect(
      annualSavingsPercent({ price: 9.99, currency: 'USD' }, { price: 94.99, currency: 'USD' }),
    ).toBe(20);
  });

  test('rounds down so the badge never overstates the saving', () => {
    // 20.76% is shown as 20%, not 21%.
    expect(annualSavingsPercent({ price: 9.99, currency: 'USD' }, { price: 94.99, currency: 'USD' }))
      .not.toBe(21);
  });

  test('uses local store prices in any currency', () => {
    expect(
      annualSavingsPercent({ price: 9000, currency: 'NGN' }, { price: 86400, currency: 'NGN' }),
    ).toBe(20);
  });

  test('no badge when the prices cannot be compared or show no saving', () => {
    expect(annualSavingsPercent({ price: 0, currency: 'USD' }, { price: 94.99, currency: 'USD' })).toBeNull();
    expect(annualSavingsPercent({ price: 9.99, currency: 'USD' }, { price: 94.99, currency: 'EUR' })).toBeNull();
    expect(annualSavingsPercent({ price: 9.99, currency: 'USD' }, { price: 130, currency: 'USD' })).toBeNull();
  });
});
