import { describe, expect, test } from 'bun:test';
import {
  extractFreeTrial,
  formatTrialLength,
  getStoreUpgradeLabel,
  getTrialCopy,
  type TrialCopyInput,
} from './intro-offer';

const base: TrialCopyInput = {
  platform: 'ios',
  freeTrial: { unit: 'week', count: 2 },
  eligible: true,
  storeAvailable: true,
  localizedPrice: '$9.99',
  interval: 'monthly',
};

describe('extractFreeTrial', () => {
  test('reads a free-trial introductory offer from subscriptionOffers', () => {
    expect(extractFreeTrial({
      subscriptionOffers: [
        { type: 'promotional', paymentMode: 'free-trial', period: { unit: 'month', value: 1 } },
        { type: 'introductory', paymentMode: 'free-trial', period: { unit: 'week', value: 2 }, periodCount: 1 },
      ],
    })).toEqual({ unit: 'week', count: 2 });
  });

  test('ignores paid intro offers', () => {
    expect(extractFreeTrial({
      subscriptionOffers: [{ type: 'introductory', paymentMode: 'pay-as-you-go', period: { unit: 'month', value: 1 } }],
      introductoryPricePaymentModeIOS: 'pay-as-you-go',
    })).toBeNull();
  });

  test('falls back to the legacy iOS intro fields', () => {
    expect(extractFreeTrial({
      introductoryPricePaymentModeIOS: 'free-trial',
      introductoryPriceSubscriptionPeriodIOS: 'day',
      introductoryPriceNumberOfPeriodsIOS: '7',
    })).toEqual({ unit: 'day', count: 7 });
  });

  test('returns null without an offer', () => {
    expect(extractFreeTrial({ introductoryPricePaymentModeIOS: 'empty' })).toBeNull();
    expect(extractFreeTrial(null)).toBeNull();
  });
});

describe('trial copy', () => {
  test('formats weeks as days', () => {
    expect(formatTrialLength({ unit: 'week', count: 2 })).toEqual({ phrase: '14 days', adjective: '14-day' });
    expect(formatTrialLength({ unit: 'month', count: 1 })).toEqual({ phrase: '1 month', adjective: '1-month' });
  });

  test('offers the trial with its terms when StoreKit says the member is eligible', () => {
    expect(getTrialCopy(base)).toEqual({
      label: 'Start 14-day free trial',
      disclosure: 'Free for 14 days, then $9.99/month. Cancel anytime in Settings.',
    });
    expect(getTrialCopy({ ...base, interval: 'annual', localizedPrice: '$79.00' })?.disclosure)
      .toBe('Free for 14 days, then $79.00/year. Cancel anytime in Settings.');
  });

  test.each([
    ['ineligible', { eligible: false }],
    ['eligibility unknown', { eligible: undefined }],
    ['no intro offer', { freeTrial: null }],
    ['a fallback product', { storeAvailable: false }],
    ['Android without a free-trial offer', { platform: 'android', freeTrial: null, eligible: false }],
    ['web', { platform: 'web' }],
  ] as const)('says Subscribe to Pro with no disclosure when %s', (_, overrides) => {
    const input = { ...base, ...overrides } as TrialCopyInput;
    expect(getTrialCopy(input)).toBeNull();
    expect(getStoreUpgradeLabel(input)).toBe('Subscribe to Pro');
  });
});

describe('Android trial copy', () => {
  const android: TrialCopyInput = { ...base, platform: 'android', freeTrial: { unit: 'day', count: 14 }, eligible: true };

  test('offers the 14-day trial when Google Play returned the free-trial offer', () => {
    expect(getTrialCopy(android)).toEqual({
      label: 'Start 14-day free trial',
      disclosure: 'Free for 14 days, then $9.99/month. Cancel anytime in Google Play.',
    });
    expect(getStoreUpgradeLabel(android)).toBe('Start 14-day free trial');
  });

  test('a two-week billing period reads as 14 days', () => {
    expect(getTrialCopy({ ...android, freeTrial: { unit: 'week', count: 2 } })?.label).toBe('Start 14-day free trial');
  });

  test('no trial for a fallback product', () => {
    expect(getTrialCopy({ ...android, storeAvailable: false })).toBeNull();
  });

  test('iOS copy still points to Settings', () => {
    expect(getTrialCopy(base)?.disclosure).toBe('Free for 14 days, then $9.99/month. Cancel anytime in Settings.');
  });
});
