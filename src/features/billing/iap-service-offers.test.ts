import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test';
import { Platform } from 'react-native';

/**
 * Store purchase requests per platform, with expo-iap mocked: Android passes
 * the Google Play offer token (the free trial when offered), iOS is unchanged.
 */
let products: any[] = [];
const requestPurchase = mock(async (_request: any) => null);
const handledError = mock((..._args: any[]) => {});

mock.module('expo-iap', () => ({
  initConnection: async () => true,
  fetchProducts: async () => products,
  requestPurchase,
  isEligibleForIntroOfferIOS: async () => true,
  purchaseUpdatedListener: () => ({ remove: () => {} }),
  purchaseErrorListener: () => ({ remove: () => {} }),
  getAvailablePurchases: async () => [],
  finishTransaction: async () => {},
  endConnection: async () => {},
}));
mock.module('expo-linking', () => ({ canOpenURL: async () => false, openURL: async () => {} }));
mock.module('expo-web-browser', () => ({ openBrowserAsync: async () => {} }));
mock.module('@sentry/react-native', () => ({ captureMessage: () => {} }));
mock.module('@/api/mutations', () => ({ post: async () => ({ data: { success: true } }) }));
mock.module('@/lib/logger', () => ({
  logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {}, handledError },
}));

const { iapService } = await import('./iap-service');
const { IAP_SKUS } = await import('./iap-constants');

const phase = (billingPeriod: string, priceAmountMicros: string) => ({
  billingPeriod, billingCycleCount: 1, priceAmountMicros, formattedPrice: '', priceCurrencyCode: 'USD', recurrenceMode: 1,
});
const basePlanOffer = (token: string) => ({
  id: 'monthly', basePlanIdAndroid: 'monthly', offerTokenAndroid: token, paymentMode: 'pay-as-you-go',
  displayPrice: '$9.99', price: 9.99, type: 'introductory',
  pricingPhasesAndroid: { pricingPhaseList: [phase('P1M', '9990000')] },
});
const trialOffer = (token: string) => ({
  id: 'trial', basePlanIdAndroid: 'monthly', offerTokenAndroid: token, paymentMode: 'free-trial',
  displayPrice: '$0.00', price: 0, type: 'introductory',
  pricingPhasesAndroid: { pricingPhaseList: [phase('P14D', '0'), phase('P1M', '9990000')] },
});
const androidProduct = (id: string, subscriptionOffers: any[]) => ({
  id, platform: 'android', type: 'subs', title: 'Pro', description: '', displayPrice: '$9.99', price: 9.99,
  currency: 'USD', subscriptionOffers,
});

function setPlatform(os: 'ios' | 'android') {
  (Platform as { OS: string }).OS = os;
  iapService.cleanup();
}

async function startPurchase(interval: 'monthly' | 'annual') {
  void iapService.purchaseSubscription(interval, 'account-token').catch(() => {});
  for (let i = 0; i < 20 && requestPurchase.mock.calls.length === 0; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  const request = requestPurchase.mock.calls[0]?.[0];
  iapService.cleanup();
  return request;
}

afterAll(() => setPlatform('ios'));

beforeEach(() => {
  requestPurchase.mockClear();
  handledError.mockClear();
});

describe('Android subscription offers', () => {
  test('getProducts stores the free-trial offer token and marks the trial', async () => {
    setPlatform('android');
    products = [
      androidProduct(IAP_SKUS.android.monthly, [basePlanOffer('base-m'), trialOffer('trial-m')]),
      androidProduct(IAP_SKUS.android.annual, [basePlanOffer('base-a')]),
    ];
    const result = await iapService.getProducts(true);
    const monthly = result.find((p) => p.interval === 'monthly');
    const annual = result.find((p) => p.interval === 'annual');
    expect(monthly).toMatchObject({
      offerToken: 'trial-m',
      basePlanOfferToken: 'base-m',
      freeTrial: { unit: 'day', count: 14 },
      introOfferEligible: true,
    });
    expect(annual).toMatchObject({
      offerToken: 'base-a',
      basePlanOfferToken: 'base-a',
      freeTrial: null,
      introOfferEligible: false,
    });
  });

  test('requestPurchase receives the free-trial offer token', async () => {
    setPlatform('android');
    products = [androidProduct(IAP_SKUS.android.monthly, [basePlanOffer('base-m'), trialOffer('trial-m')])];
    const request = await startPurchase('monthly');
    expect(request).toEqual({
      type: 'subs',
      request: {
        google: {
          skus: [IAP_SKUS.android.monthly],
          obfuscatedAccountId: 'account-token',
          obfuscatedProfileId: 'account-token',
          subscriptionOffers: [{ sku: IAP_SKUS.android.monthly, offerToken: 'trial-m' }],
        },
      },
    });
  });

  test('requestPurchase receives the base plan token without a trial offer', async () => {
    setPlatform('android');
    products = [androidProduct(IAP_SKUS.android.annual, [basePlanOffer('base-a')])];
    const request = await startPurchase('annual');
    expect(request.request.google.subscriptionOffers).toEqual([{ sku: IAP_SKUS.android.annual, offerToken: 'base-a' }]);
  });

  test('without any offer token the purchase still goes through and is logged', async () => {
    setPlatform('android');
    products = [androidProduct(IAP_SKUS.android.monthly, [])];
    const request = await startPurchase('monthly');
    expect(request.request.google).toEqual({
      skus: [IAP_SKUS.android.monthly],
      obfuscatedAccountId: 'account-token',
      obfuscatedProfileId: 'account-token',
    });
    expect(handledError.mock.calls.some((call) => String(call[0]).includes('no Google Play offer token'))).toBe(true);
  });
});

describe('iOS purchases are unchanged', () => {
  test('requestPurchase sends the Apple request with no offer token', async () => {
    setPlatform('ios');
    products = [{
      id: IAP_SKUS.ios.monthly, platform: 'ios', type: 'subs', title: 'Pro', description: '', displayPrice: '$9.99',
      price: 9.99, currency: 'USD', subscriptionGroupIdIOS: 'group',
      subscriptionOffers: [{ type: 'introductory', paymentMode: 'free-trial', period: { unit: 'week', value: 2 }, periodCount: 1 }],
    }];
    const [product] = await iapService.getProducts(true);
    expect(product).toMatchObject({ freeTrial: { unit: 'week', count: 2 }, introOfferEligible: true });
    expect(product).not.toHaveProperty('offerToken');

    const request = await startPurchase('monthly');
    expect(request).toEqual({
      type: 'subs',
      request: { apple: { sku: IAP_SKUS.ios.monthly, appAccountToken: 'account-token' } },
    });
  });
});
