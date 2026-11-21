/**
 * iap-service.ts
 * Unified StoreKit & Google Play Billing service for Memento Mobile
 */

import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as RNIap from 'expo-iap';
import * as Sentry from '@sentry/react-native';
import { post } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { logger } from '@/lib/logger';
import { extractFreeTrial } from './intro-offer';
import { selectAndroidOffer } from './android-offers';
import { reportTrialStatus } from './trial-diagnostics';
import {
  FALLBACK_PRODUCTS,
  getAllPlatformSkus,
  getIntervalFromSku,
  getPlatformSku,
  getStoreManagementUrl,
} from './iap-constants';
import type {
  IAPPlanInterval,
  IAPProduct,
  IAPVerificationPayload,
  IAPVerificationResult,
} from './iap-types';

interface IAPListenerSubscription {
  remove: () => void;
}

function purchaseErrorMessage(error: {code?: string; message?: string}): string {
  if (error.code === 'sku-not-found' || error.code === 'store-product-unavailable') {
    return 'Purchases are temporarily unavailable. Please try again later.';
  }
  return error.message || 'In-app purchase failed';
}

class InAppPurchaseService {
  public isUsingFallbacks = false;
  private isInitialized = false;
  private isConnecting = false;
  private updateSubscription: IAPListenerSubscription | null = null;
  private errorSubscription: IAPListenerSubscription | null = null;
  private cachedProducts: IAPProduct[] | null = null;

  private pendingPurchaseResolver: ((result: IAPVerificationResult) => void) | null = null;
  private pendingPurchaseRejecter: ((error: Error) => void) | null = null;
  private purchaseTimeoutId: ReturnType<typeof setTimeout> | null = null;

  private clearPendingPurchase(): void {
    if (this.purchaseTimeoutId) {
      clearTimeout(this.purchaseTimeoutId);
      this.purchaseTimeoutId = null;
    }
    this.pendingPurchaseResolver = null;
    this.pendingPurchaseRejecter = null;
  }

  public async initialize(): Promise<boolean> {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      return false;
    }
    if (this.isInitialized) {
      return true;
    }
    if (this.isConnecting) {
      return false;
    }

    this.isConnecting = true;
    try {
      const available = await RNIap.initConnection();
      this.isInitialized = Boolean(available);

      if (this.isInitialized) {
        this.setupListeners();
        // Asynchronously reconcile any unfinished purchases from prior sessions
        void this.reconcileUnfinishedPurchases();
      }
      return this.isInitialized;
    } catch (err) {
      logger.handledError('[IAPService] initConnection error:', err);
      this.isInitialized = false;
      return false;
    } finally {
      this.isConnecting = false;
    }
  }

  private setupListeners(): void {
    if (this.updateSubscription || this.errorSubscription) {
      return;
    }

    this.updateSubscription = RNIap.purchaseUpdatedListener(async (purchase: RNIap.Purchase) => {
      logger.debug('[IAPService] purchaseUpdated:', purchase.productId, purchase.transactionId);
      try {
        const result = await this.verifyAndFinishPurchase(purchase);
        if (this.pendingPurchaseResolver) {
          const resolve = this.pendingPurchaseResolver;
          this.clearPendingPurchase();
          resolve(result);
        }
      } catch (err: any) {
        logger.handledError('[IAPService] purchase verification failed:', err);
        if (this.pendingPurchaseRejecter) {
          const reject = this.pendingPurchaseRejecter;
          this.clearPendingPurchase();
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      }
    });

    this.errorSubscription = RNIap.purchaseErrorListener((error: any) => {
      logger.handledError('[IAPService] purchaseError:', error?.code, error?.message);
      if (this.pendingPurchaseRejecter) {
        const reject = this.pendingPurchaseRejecter;
        this.clearPendingPurchase();
        const message = purchaseErrorMessage(error ?? {});
        const err = new Error(message);
        (err as any).code = error?.code;
        reject(err);
      }
    });
  }

  public async getProducts(forceRefresh = false): Promise<IAPProduct[]> {
    if (!forceRefresh && this.cachedProducts && this.cachedProducts.length > 0) {
      return this.cachedProducts;
    }

    const fallbacks = [FALLBACK_PRODUCTS.monthly, FALLBACK_PRODUCTS.annual];
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      return fallbacks;
    }

    await this.initialize();
    if (!this.isInitialized) {
      this.isUsingFallbacks = true;
      return fallbacks;
    }

    try {
      const skus = getAllPlatformSkus();
      const subscriptions = await RNIap.fetchProducts({ skus, type: 'subs' });
      const returnedProductIds = (subscriptions ?? [])
        .map((subscription: any) => subscription.id || subscription.productId)
        .filter((productId: unknown): productId is string => typeof productId === 'string');

      if (__DEV__) {
        logger.debug('[IAPService] product catalog:', {
          requestedSkus: skus,
          returnedProductIds,
          platform: Platform.OS,
        });
      }

      if (!subscriptions || subscriptions.length === 0) {
        this.cachedProducts = null;
        this.isUsingFallbacks = true;
        return fallbacks;
      }

      const { eligibility, error: eligibilityError } = await this.introOfferEligibility(subscriptions);
      const products: IAPProduct[] = subscriptions.flatMap((sub: any) => {
        const productId = sub.id || sub.productId;
        if (!skus.includes(productId)) return [];
        const interval = getIntervalFromSku(productId);
        const fallback = FALLBACK_PRODUCTS[interval];
        const rawPrice = typeof sub.price === 'string' ? parseFloat(sub.price) : Number(sub.price ?? fallback.price);
        const isIOS = Platform.OS === 'ios';
        const androidOffer = isIOS ? null : selectAndroidOffer(sub);

        return [{
          productId,
          title: sub.title || fallback.title,
          description: sub.description || fallback.description,
          price: isNaN(rawPrice) ? fallback.price : rawPrice,
          currency: sub.currency || fallback.currency,
          localizedPrice: sub.displayPrice || sub.localizedPrice || fallback.localizedPrice,
          interval,
          storeAvailable: true,
          freeTrial: isIOS ? extractFreeTrial(sub) : androidOffer?.freeTrial ?? null,
          introOfferEligible: isIOS
            ? typeof sub.subscriptionGroupIdIOS === 'string' && eligibility.get(sub.subscriptionGroupIdIOS) === true
            : Boolean(androidOffer?.freeTrial),
          ...(androidOffer
            ? { offerToken: androidOffer.offerToken, basePlanOfferToken: androidOffer.basePlanOfferToken }
            : {}),
        }];
      });

      this.cachedProducts = products.length > 0 ? products : null;
      this.isUsingFallbacks = products.length !== skus.length;
      if (Platform.OS === 'ios') reportTrialStatus(Sentry, products, eligibilityError);
      return products;
    } catch (err) {
      logger.handledError('[IAPService] fetchProducts error, using fallbacks:', err);
      this.isUsingFallbacks = true;
      return fallbacks;
    }
  }

  /** StoreKit intro-offer eligibility per subscription group; unknown counts as not eligible. */
  private async introOfferEligibility(
    subscriptions: any[],
  ): Promise<{ eligibility: Map<string, boolean>; error?: string }> {
    const result = new Map<string, boolean>();
    let error: string | undefined;
    if (Platform.OS !== 'ios') return { eligibility: result };
    const groups = new Set<string>(
      subscriptions
        .map((sub) => sub?.subscriptionGroupIdIOS)
        .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0),
    );
    await Promise.all([...groups].map(async (groupId) => {
      try {
        result.set(groupId, await RNIap.isEligibleForIntroOfferIOS(groupId));
      } catch (err) {
        logger.handledError('[IAPService] intro offer eligibility check failed:', err);
        error = err instanceof Error ? err.message : String(err);
        result.set(groupId, false);
      }
    }));
    return { eligibility: result, error };
  }

  public async purchaseSubscription(
    interval: IAPPlanInterval,
    storeAccountToken: string,
  ): Promise<IAPVerificationResult> {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      throw new Error('In-app purchases are only supported on iOS and Android devices.');
    }

    // Concurrency guard: reject if a purchase is already active
    if (this.pendingPurchaseResolver) {
      throw new Error('A purchase transaction is already in progress. Please complete or cancel it first.');
    }

    await this.initialize();
    if (!this.isInitialized) {
      throw new Error('Could not connect to the App Store. Please try again.');
    }

    const sku = getPlatformSku(interval);
    if (!storeAccountToken) {
      throw new Error('Your billing account is still being prepared. Please try again.');
    }

    const storeProducts = await this.getProducts(true);
    const selectedProduct = storeProducts.find(
      (product) => product.productId === sku && product.storeAvailable,
    );
    if (!selectedProduct) {
      if (__DEV__) {
        logger.handledError('[IAPService] selected product unavailable:', {
          selectedSku: sku,
          returnedProductIds: storeProducts
            .filter((product) => product.storeAvailable)
            .map((product) => product.productId),
          platform: Platform.OS,
        });
      }
      const error = new Error(
        'Purchases are temporarily unavailable. Please try again later.',
      );
      (error as Error & {code?: string}).code = 'store-product-unavailable';
      throw error;
    }

    return new Promise<IAPVerificationResult>(async (resolve, reject) => {
      this.pendingPurchaseResolver = resolve;
      this.pendingPurchaseRejecter = reject;

      // 60-second timeout guard
      this.purchaseTimeoutId = setTimeout(() => {
        if (this.pendingPurchaseRejecter) {
          const timeoutReject = this.pendingPurchaseRejecter;
          this.clearPendingPurchase();
          timeoutReject(new Error('Purchase confirmation timed out. If your account was charged, please tap Restore Purchases.'));
        }
      }, 60000);

      try {
        if (Platform.OS === 'ios') {
          await RNIap.requestPurchase({
            type: 'subs',
            request: {
              apple: { sku, appAccountToken: storeAccountToken },
            },
          });
        } else {
          // Play Billing 5+ buys a subscription through an offer: the free trial when
          // Google offered one to this account, otherwise the base plan.
          const offerToken = selectedProduct.offerToken || selectedProduct.basePlanOfferToken || null;
          if (!offerToken) {
            logger.handledError('[IAPService] no Google Play offer token for subscription:', sku);
          }
          await RNIap.requestPurchase({
            type: 'subs',
            request: {
              google: {
                skus: [sku],
                obfuscatedAccountId: storeAccountToken,
                obfuscatedProfileId: storeAccountToken,
                ...(offerToken ? { subscriptionOffers: [{ sku, offerToken }] } : {}),
              },
            },
          });
        }
      } catch (err: any) {
        this.clearPendingPurchase();
        logger.handledError('[IAPService] requestPurchase error:', err);
        const normalized = new Error(purchaseErrorMessage(err ?? {}));
        (normalized as Error & {code?: string}).code = err?.code;
        reject(normalized);
      }
    });
  }

  public async requestSubscriptionPurchase(
    interval: IAPPlanInterval,
    storeAccountToken: string,
  ): Promise<boolean> {
    try {
      const result = await this.purchaseSubscription(interval, storeAccountToken);
      return Boolean(result.success);
    } catch (err: any) {
      if (err?.code === 'E_USER_CANCELLED' || err?.code === 'user-cancelled') {
        return false;
      }
      throw err;
    }
  }

  public async verifyAndFinishPurchase(purchase: RNIap.Purchase): Promise<IAPVerificationResult> {
    const payload: IAPVerificationPayload = {
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      productId: purchase.productId || (purchase as any).id,
      transactionId: purchase.transactionId ?? `tx-${Date.now()}`,
      receiptData: purchase.purchaseToken ?? undefined,
      purchaseToken: purchase.purchaseToken ?? undefined,
    };

    // Strictly fail-closed: verify with server before granting entitlement or finishing transaction
    const res = await post<IAPVerificationResult>(endpoint.billingIapVerify, payload);
    const data = res?.data;

    if (!data || data.success === false) {
      throw new Error(data?.message || 'Purchase verification failed on the server.');
    }

    const normalizedStatus =
      data.status === 'active' || data.status === 'trialing' || data.status === 'cancelled'
        ? data.status
        : 'active';

    const result: IAPVerificationResult = {
      success: true,
      tier: data.tier ?? 'pro',
      status: normalizedStatus,
      expiresAt: data.expiresAt,
    };

    // Only finish transaction with Apple/Google once server confirms entitlement is durable
    // Retry up to 3 times if transient store finish error occurs
    let finished = false;
    let finishAttempts = 0;
    while (!finished && finishAttempts < 3) {
      try {
        await RNIap.finishTransaction({ purchase, isConsumable: false });
        finished = true;
      } catch (finishErr) {
        finishAttempts++;
        logger.handledError(`[IAPService] finishTransaction attempt ${finishAttempts} failed:`, finishErr);
        if (finishAttempts < 3) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }

    return result;
  }

  public async reconcileUnfinishedPurchases(): Promise<void> {
    try {
      const purchases = await RNIap.getAvailablePurchases({
        onlyIncludeActiveItemsIOS: true,
      });

      const allowedSkus = getAllPlatformSkus();
      const valid = purchases.filter((p) => allowedSkus.includes(p.productId || (p as any).id));
      for (const purchase of valid) {
        try {
          await this.verifyAndFinishPurchase(purchase);
        } catch (err) {
          logger.handledError('[IAPService] Reconciling unfinished purchase failed:', err);
        }
      }
    } catch (err) {
      logger.handledError('[IAPService] reconcileUnfinishedPurchases error:', err);
    }
  }

  public async restorePurchases(): Promise<{ restoredCount: number; success: boolean }> {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      return { restoredCount: 0, success: false };
    }

    await this.initialize();
    if (!this.isInitialized) {
      throw new Error('Could not connect to the store to restore purchases.');
    }

    try {
      const purchases = await RNIap.getAvailablePurchases({
        onlyIncludeActiveItemsIOS: true,
      });

      const allowedSkus = getAllPlatformSkus();
      const validPurchases = purchases.filter((p) => {
        const pid = p.productId || (p as any).id;
        return allowedSkus.includes(pid);
      });

      let restoredCount = 0;
      for (const purchase of validPurchases) {
        try {
          const verified = await this.verifyAndFinishPurchase(purchase);
          if (verified.success) {
            restoredCount++;
          }
        } catch (verifyErr) {
          logger.handledError('[IAPService] restore purchase verification failed:', verifyErr);
        }
      }

      return {
        restoredCount,
        success: restoredCount > 0 || validPurchases.length === 0,
      };
    } catch (err: any) {
      logger.handledError('[IAPService] restorePurchases error:', err);
      throw err;
    }
  }

  public async openSubscriptionManagement(
    sku?: string,
    provider?: 'apple' | 'google',
  ): Promise<void> {
    try {
      if (
        (!provider || provider === 'google') &&
        Platform.OS === 'android' &&
        typeof RNIap.deepLinkToSubscriptions === 'function'
      ) {
        await RNIap.deepLinkToSubscriptions({
          skuAndroid: sku,
          packageNameAndroid: 'io.mymemento.app',
        });
        return;
      }
    } catch {
      // fallback to linking URL
    }

    try {
      let resolvedProvider = provider;
      if (!resolvedProvider) {
        try {
          const { queryClient } = await import('@/lib/query-client');
          const { queryKeys } = await import('@/constants/query-keys');
          const sub = queryClient.getQueryData<any>(queryKeys.subscription);
          if (sub?.provider === 'apple' || sub?.provider === 'google') {
            resolvedProvider = sub.provider;
          }
        } catch {
          // fallback to platform
        }
      }
      const url = getStoreManagementUrl(resolvedProvider);
      const canOpen = await Linking.canOpenURL(url).catch(() => false);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        await WebBrowser.openBrowserAsync(url).catch(() => {});
      }
    } catch (linkErr) {
      logger.handledError('[IAPService] openSubscriptionManagement failed:', linkErr);
    }
  }

  public cleanup(): void {
    if (this.updateSubscription) {
      this.updateSubscription.remove();
      this.updateSubscription = null;
    }
    if (this.errorSubscription) {
      this.errorSubscription.remove();
      this.errorSubscription = null;
    }
    this.clearPendingPurchase();
    if (this.isInitialized) {
      RNIap.endConnection().catch(() => { });
      this.isInitialized = false;
    }
  }
}

export const iapService = new InAppPurchaseService();
