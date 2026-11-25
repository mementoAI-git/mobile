/**
 * iap-constants.ts
 * Canonical product SKUs, store URLs, and legal disclosures for StoreKit & Google Play Billing
 */

import { Platform } from 'react-native';
import { TERMS_URL, PRIVACY_URL, SUPPORT_EMAIL_URL } from '@/lib/env';
import type { IAPPlanInterval, IAPProduct } from './iap-types';

export const IAP_SKUS = {
  ios: {
    monthly: 'io.mymemento.app.pro.monthly',
    annual: 'io.mymemento.app.pro.annual',
  },
  android: {
    monthly: 'memento_pro_monthly',
    annual: 'memento_pro_annual',
  },
} as const;

export function getPlatformSku(interval: IAPPlanInterval): string {
  const isIos = Platform.OS === 'ios';
  return isIos ? IAP_SKUS.ios[interval] : IAP_SKUS.android[interval];
}

export function getAllPlatformSkus(): string[] {
  const isIos = Platform.OS === 'ios';
  const skus = isIos ? IAP_SKUS.ios : IAP_SKUS.android;
  return [skus.monthly, skus.annual];
}

export function getIntervalFromSku(sku: string): IAPPlanInterval {
  if (sku === IAP_SKUS.ios.annual || sku === IAP_SKUS.android.annual) {
    return 'annual';
  }
  return 'monthly';
}

export const FALLBACK_PRODUCTS: Record<IAPPlanInterval, IAPProduct> = {
  monthly: {
    productId: getPlatformSku('monthly'),
    title: 'Memento Pro Monthly',
    description: 'Full access to voice mode, AI memory insights, and expanded 10GB storage.',
    price: 9.99,
    currency: 'USD',
    localizedPrice: '$9.99',
    interval: 'monthly',
    storeAvailable: false,
  },
  annual: {
    productId: getPlatformSku('annual'),
    title: 'Memento Pro Annual',
    description: 'Full access to voice mode, AI memory insights, and expanded 10GB storage.',
    price: 94.99,
    currency: 'USD',
    localizedPrice: '$94.99',
    interval: 'annual',
    storeAvailable: false,
  },
};

export const IAP_LEGAL_URLS = {
  terms: TERMS_URL,
  privacy: PRIVACY_URL,
  support: SUPPORT_EMAIL_URL,
};

export const IAP_STORE_MANAGEMENT_URLS = {
  ios: 'https://apps.apple.com/account/subscriptions',
  android: 'https://play.google.com/store/account/subscriptions?package=io.mymemento.app',
};

export function getStoreManagementUrl(provider?: 'apple' | 'google'): string {
  if (provider === 'apple') return IAP_STORE_MANAGEMENT_URLS.ios;
  if (provider === 'google') return IAP_STORE_MANAGEMENT_URLS.android;
  return Platform.OS === 'ios'
    ? IAP_STORE_MANAGEMENT_URLS.ios
    : IAP_STORE_MANAGEMENT_URLS.android;
}

export const IAP_DISCLOSURE_COPY_IOS =
  'Payment will be charged to your Apple ID upon confirmation of purchase. ' +
  'Subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current period. ' +
  'Your account will be charged for renewal within 24 hours prior to the end of the current period. ' +
  'You can manage and cancel your subscriptions anytime in your App Store account settings.';

export const IAP_DISCLOSURE_COPY_ANDROID =
  'Payment will be charged to your Google Play account upon confirmation of purchase. ' +
  'Subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current period. ' +
  'Your account will be charged for renewal within 24 hours prior to the end of the current period. ' +
  'You can manage and cancel your subscriptions anytime in your Play Store account settings.';

export function getIapDisclosureCopy(os: typeof Platform.OS = Platform.OS): string {
  return os === 'android' ? IAP_DISCLOSURE_COPY_ANDROID : IAP_DISCLOSURE_COPY_IOS;
}

export const IAP_DISCLOSURE_COPY = getIapDisclosureCopy();
