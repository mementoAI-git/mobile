import { describe, expect, test } from 'bun:test';
import { getOfferFreeTrial, parseBillingPeriod, selectAndroidOffer } from './android-offers';

const basePlan = {
  id: 'monthly',
  basePlanIdAndroid: 'monthly',
  offerTokenAndroid: 'base-token',
  paymentMode: 'pay-as-you-go',
  pricingPhasesAndroid: {
    pricingPhaseList: [{ billingPeriod: 'P1M', billingCycleCount: 0, priceAmountMicros: '9990000', recurrenceMode: 1 }],
  },
};

const trial = {
  id: 'free-trial-14d',
  basePlanIdAndroid: 'monthly',
  offerTokenAndroid: 'trial-token',
  paymentMode: 'free-trial',
  pricingPhasesAndroid: {
    pricingPhaseList: [
      { billingPeriod: 'P2W', billingCycleCount: 1, priceAmountMicros: '0', recurrenceMode: 2 },
      { billingPeriod: 'P1M', billingCycleCount: 0, priceAmountMicros: '9990000', recurrenceMode: 1 },
    ],
  },
};

describe('parseBillingPeriod', () => {
  test.each([
    ['P2W', { unit: 'week', count: 2 }],
    ['P14D', { unit: 'day', count: 14 }],
    ['P1M', { unit: 'month', count: 1 }],
    ['P1Y', { unit: 'year', count: 1 }],
    ['P1W3D', { unit: 'day', count: 10 }],
  ] as const)('%s', (period, expected) => {
    expect(parseBillingPeriod(period)).toEqual(expected);
  });

  test.each(['', 'P', 'P0D', '14D', 'PT1H', 'P1M2D', null, undefined])('rejects %p', (period) => {
    expect(parseBillingPeriod(period as string | null | undefined)).toBeNull();
  });
});

describe('getOfferFreeTrial', () => {
  test('reads the free pricing phase', () => {
    expect(getOfferFreeTrial(trial)).toEqual({ unit: 'week', count: 2 });
  });

  test('falls back to the OpenIAP payment mode and period', () => {
    expect(getOfferFreeTrial({
      offerTokenAndroid: 't',
      paymentMode: 'free-trial',
      period: { unit: 'day', value: 14 },
      periodCount: 1,
    })).toEqual({ unit: 'day', count: 14 });
  });

  test('a paid offer has no trial', () => {
    expect(getOfferFreeTrial(basePlan)).toBeNull();
  });
});

describe('selectAndroidOffer', () => {
  test('picks the free-trial offer when Google returned one', () => {
    expect(selectAndroidOffer({ subscriptionOffers: [basePlan, trial] })).toEqual({
      offerToken: 'trial-token',
      basePlanOfferToken: 'base-token',
      freeTrial: { unit: 'week', count: 2 },
    });
  });

  test('picks the base plan when the account has no trial offer', () => {
    expect(selectAndroidOffer({ subscriptionOffers: [basePlan] })).toEqual({
      offerToken: 'base-token',
      basePlanOfferToken: 'base-token',
      freeTrial: null,
    });
  });

  test('returns no token when the product has no offers', () => {
    const none = { offerToken: null, basePlanOfferToken: null, freeTrial: null };
    expect(selectAndroidOffer({ subscriptionOffers: [] })).toEqual(none);
    expect(selectAndroidOffer({})).toEqual(none);
    expect(selectAndroidOffer(null)).toEqual(none);
    expect(selectAndroidOffer({ subscriptionOffers: [{ ...basePlan, offerTokenAndroid: '' }] })).toEqual(none);
  });
});
