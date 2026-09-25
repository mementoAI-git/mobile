import { describe, expect, test } from 'bun:test';
import {
  FALLBACK_PRODUCTS,
  IAP_DISCLOSURE_COPY,
  IAP_LEGAL_URLS,
  IAP_SKUS,
  IAP_STORE_MANAGEMENT_URLS,
  getAllPlatformSkus,
  getIntervalFromSku,
  getPlatformSku,
  getStoreManagementUrl,
} from './iap-constants';

describe('IAP Constants and SKUs', () => {
  test('defines canonical SKUs for iOS and Android', () => {
    expect(IAP_SKUS.ios.monthly).toBe('io.mymemento.app.pro.monthly');
    expect(IAP_SKUS.ios.annual).toBe('io.mymemento.app.pro.annual');
    expect(IAP_SKUS.android.monthly).toBe('memento_pro_monthly');
    expect(IAP_SKUS.android.annual).toBe('memento_pro_annual');
  });

  test('resolves platform SKUs and all platform SKUs list', () => {
    const monthlySku = getPlatformSku('monthly');
    const annualSku = getPlatformSku('annual');
    const allSkus = getAllPlatformSkus();

    expect(allSkus).toContain(monthlySku);
    expect(allSkus).toContain(annualSku);
    expect(allSkus.length).toBe(2);
  });

  test('determines interval from SKU correctly', () => {
    expect(getIntervalFromSku('io.mymemento.app.pro.annual')).toBe('annual');
    expect(getIntervalFromSku('memento_pro_annual')).toBe('annual');
    expect(getIntervalFromSku('io.mymemento.app.pro.monthly')).toBe('monthly');
    expect(getIntervalFromSku('memento_pro_monthly')).toBe('monthly');
    expect(getIntervalFromSku('unknown_sku')).toBe('monthly');
  });

  test('provides valid fallback products with prices and descriptions', () => {
    expect(FALLBACK_PRODUCTS.monthly.price).toBe(9.99);
    expect(FALLBACK_PRODUCTS.monthly.localizedPrice).toBe('$9.99');
    expect(FALLBACK_PRODUCTS.monthly.interval).toBe('monthly');

    expect(FALLBACK_PRODUCTS.annual.price).toBe(79.0);
    expect(FALLBACK_PRODUCTS.annual.localizedPrice).toBe('$79.00');
    expect(FALLBACK_PRODUCTS.annual.interval).toBe('annual');
  });

  test('contains mandatory App Store legal URLs', () => {
    expect(IAP_LEGAL_URLS.terms).toContain('/terms');
    expect(IAP_LEGAL_URLS.privacy).toContain('/privacy');
    expect(IAP_LEGAL_URLS.support).toContain('/support');
    expect(IAP_LEGAL_URLS.terms.startsWith('https://')).toBe(true);
    expect(IAP_LEGAL_URLS.privacy.startsWith('https://')).toBe(true);
  });

  test('provides store management URLs for iOS and Android', () => {
    expect(IAP_STORE_MANAGEMENT_URLS.ios).toContain('apps.apple.com');
    expect(IAP_STORE_MANAGEMENT_URLS.android).toContain('play.google.com');
    expect(getStoreManagementUrl()).toBeTruthy();
  });

  test('disclosure copy includes Apple and Google auto-renewal notice', () => {
    expect(IAP_DISCLOSURE_COPY).toContain('Payment will be charged');
    expect(IAP_DISCLOSURE_COPY).toContain('Subscription automatically renews');
    expect(IAP_DISCLOSURE_COPY).toContain('at least 24 hours before the end of the current period');
  });
});
