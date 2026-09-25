import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const iapServiceSource = readFileSync('src/features/billing/iap-service.ts', 'utf8');
const useIapSource = readFileSync('src/features/billing/use-iap.ts', 'utf8');
const billingFlowSource = readFileSync('src/features/settings/billing-flow.ts', 'utf8');

describe('IAP Service and Hook contracts', () => {
  test('iap-service imports and uses expo-iap methods', () => {
    expect(iapServiceSource).toContain("from 'expo-iap'");
    expect(iapServiceSource).toContain('initConnection');
    expect(iapServiceSource).toContain('fetchProducts');
    expect(iapServiceSource).toContain('requestPurchase');
    expect(iapServiceSource).toContain('appAccountToken: storeAccountToken');
    expect(iapServiceSource).toContain('obfuscatedAccountId: storeAccountToken');
    expect(iapServiceSource).toContain('obfuscatedProfileId: storeAccountToken');
    expect(iapServiceSource).toContain('finishTransaction');
    expect(iapServiceSource).toContain('getAvailablePurchases');
    expect(iapServiceSource).toContain('purchaseUpdatedListener');
    expect(iapServiceSource).toContain('purchaseErrorListener');
  });

  test('iap-service posts to billingIapVerify endpoint', () => {
    expect(iapServiceSource).toContain('endpoint.billingIapVerify');
    expect(iapServiceSource).toContain('verifyAndFinishPurchase');
  });

  test('useIAP hook exposes products, buySubscription, and restorePurchases', () => {
    expect(useIapSource).toContain('export function useIAP');
    expect(useIapSource).toContain('buySubscription');
    expect(useIapSource).toContain('restorePurchases');
    expect(useIapSource).toContain('openManagement');
  });

  test('billing-flow routes mobile checkouts natively via iapService', () => {
    expect(billingFlowSource).toContain('iapService.requestSubscriptionPurchase');
    expect(billingFlowSource).toContain('iapService.openSubscriptionManagement');
    expect(billingFlowSource).toContain('export async function restoreBillingPurchases');
  });

  test('iap-service implements strictly fail-closed purchase verification', () => {
    expect(iapServiceSource).toContain('purchaseSubscription');
    expect(iapServiceSource).toContain('if (!data || data.success === false)');
    expect(iapServiceSource).toContain('Purchase verification failed on the server');
    // Ensure finishTransaction is called after verification
    const verifyIndex = iapServiceSource.indexOf('endpoint.billingIapVerify');
    const finishIndex = iapServiceSource.indexOf('RNIap.finishTransaction', verifyIndex);
    expect(finishIndex).toBeGreaterThan(verifyIndex);
  });

  test('iap-service implements defensive timeout, concurrency guard, and reconciliation', () => {
    expect(iapServiceSource).toContain('reconcileUnfinishedPurchases');
    expect(iapServiceSource).toContain('A purchase transaction is already in progress');
    expect(iapServiceSource).toContain('purchaseTimeoutId');
    expect(iapServiceSource).toContain('isUsingFallbacks');
  });

  test('preflights exact store catalog availability before requesting purchase', () => {
    expect(iapServiceSource).toContain('storeAvailable: true');
    expect(iapServiceSource).toContain('await this.getProducts(true)');
    expect(iapServiceSource).toContain('Purchases are temporarily unavailable');
    expect(iapServiceSource).toContain("error.code === 'sku-not-found'");
    const availabilityIndex = iapServiceSource.indexOf('await this.getProducts(true)');
    const requestIndex = iapServiceSource.indexOf('RNIap.requestPurchase', availabilityIndex);
    expect(requestIndex).toBeGreaterThan(availabilityIndex);
  });

  test('never invents a local store account token', () => {
    expect(useIapSource).not.toContain('generateStoreAccountToken');
    expect(billingFlowSource).not.toContain('generateStoreAccountToken');
    expect(useIapSource).toContain('Your billing account is still being prepared');
    expect(billingFlowSource).toContain('Your billing account is still being prepared');
  });
});

