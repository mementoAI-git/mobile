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
