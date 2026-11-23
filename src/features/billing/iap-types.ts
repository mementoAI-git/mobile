/**
 * iap-types.ts
 * Type definitions for Apple StoreKit (iOS) and Google Play Billing (Android)
 */

export type IAPPlanInterval = 'monthly' | 'annual';

export interface IAPProduct {
  productId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  localizedPrice: string;
  interval: IAPPlanInterval;
  /** True only when the native store returned this exact product identifier. */
  storeAvailable: boolean;
  /**
   * The free trial on this product: iOS's introductory offer, or Android's
   * free-trial offer (Google only lists offers this account can take).
   */
  freeTrial?: { unit: 'day' | 'week' | 'month' | 'year'; count: number } | null;
  /**
   * The member can take the free trial: StoreKit's intro-offer eligibility on
   * iOS; on Android, Google Play returned a free-trial offer for this account.
   */
  introOfferEligible?: boolean;
  /** Android: the Play offer token to buy with (the free-trial offer, else the base plan's). */
  offerToken?: string | null;
  /** Android: the base plan's own offer token, the fallback for `offerToken`. */
  basePlanOfferToken?: string | null;
}

export interface IAPVerificationPayload {
  platform: 'ios' | 'android';
  productId: string;
  transactionId: string;
  receiptData?: string;
  purchaseToken?: string;
}

export interface IAPVerificationResult {
  success: boolean;
  tier: 'pro' | 'free';
  status: 'active' | 'trialing' | 'cancelled';
  expiresAt?: string | null;
  message?: string;
}

export type IAPActionState = 'idle' | 'loading' | 'purchasing' | 'restoring';
