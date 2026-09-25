import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { QueryClient } from '@tanstack/react-query';
import { post } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import { logger } from '@/lib/logger';
import { toast } from '@/components/ui/Toast';
import { iapService } from '@/features/billing/iap-service';
import { extractBillingUrl } from './billing-adapters';
import type { BillingCancellationFeedback } from './subscription-cancellation';
import type { SubscriptionSummary } from './billing-adapters';

export type BillingCheckoutTier = 'pro' | 'legacy';
export type BillingCheckoutInterval = 'monthly' | 'annual';

interface LaunchBillingCheckoutOptions {
  tier: BillingCheckoutTier;
  interval: BillingCheckoutInterval;
  returnPath: string;
  queryClient?: QueryClient;
}

interface OpenBillingPortalOptions {
  returnPath: string;
  provider?: 'polar' | 'apple' | 'google';
}

interface BillingMutationOptions {
  queryClient?: QueryClient;
}

async function invalidateBillingQueries(queryClient?: QueryClient) {
  if (!queryClient) return;
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.subscription }),
    queryClient.invalidateQueries({ queryKey: queryKeys.billingUsage }),
    queryClient.invalidateQueries({ queryKey: queryKeys.billingInvoices }),
    queryClient.invalidateQueries({ queryKey: queryKeys.profile }),
  ]);
}

export async function launchBillingCheckout({
  tier,
  interval,
  returnPath,
  queryClient,
}: LaunchBillingCheckoutOptions) {
  // On native mobile devices (iOS / Android), use native StoreKit / Google Play Billing
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    try {
      const planInterval = interval === 'annual' ? 'annual' : 'monthly';
      let storeAccountToken = queryClient?.getQueryData<SubscriptionSummary>(
        queryKeys.subscription,
      )?.store_account_token;
      if (!storeAccountToken) {
        const refreshed = await queryClient?.fetchQuery({
          queryKey: queryKeys.subscription,
          queryFn: async () => {
            const { get } = await import('@/api/mutations');
            const { normalizeSubscriptionSummary } = await import('./billing-adapters');
            return get<unknown>(endpoint.billingSubscription).then(normalizeSubscriptionSummary);
          },
        });
        storeAccountToken = refreshed?.store_account_token;
      }
      if (!storeAccountToken) {
        throw new Error('Your billing account is still being prepared. Please try again.');
      }
      const purchased = await iapService.requestSubscriptionPurchase(
        planInterval,
        storeAccountToken,
      );
      if (purchased) {
        await invalidateBillingQueries(queryClient);
        return true;
      }
      return false;
    } catch (err: any) {
      logger.error('[BillingFlow] Native IAP checkout error:', err);
      toast(err?.message || 'A purchase error occurred. Please try again.', 'error');
      return false;
    }
  }

  // Web fallback: Polar web checkout
  const successUrl = Linking.createURL('/(tabs)/overview', {
    queryParams: { checkout: 'success' },
  });
  const cancelUrl = Linking.createURL(returnPath);
  try {
    const res = await post(endpoint.billingCheckout, {
      success_url: successUrl,
      cancel_url: cancelUrl,
      tier,
      interval,
    });

    const checkoutUrl = extractBillingUrl(res, 'checkout_url');
    if (!checkoutUrl) {
      toast('Could not start checkout. Please try again.', 'error');
      return false;
    }

    await WebBrowser.openBrowserAsync(checkoutUrl);
    await invalidateBillingQueries(queryClient);
    return true;
  } catch (err: any) {
    logger.error('Checkout error:', err);
    toast(err?.message || 'A billing error occurred. Please try again.', 'error');
    return false;
  }
}

export async function openBillingPortal({ returnPath, provider }: OpenBillingPortalOptions) {
  if (provider === 'apple' || provider === 'google') {
    await iapService.openSubscriptionManagement();
    return true;
  }

  const redirectUrl = Linking.createURL(returnPath);
  try {
    const res = await post(endpoint.billingPortal, {
      return_url: redirectUrl,
    });

    const portalUrl = extractBillingUrl(res, 'portal_url');
    if (!portalUrl) {
      toast('Could not open billing portal. Please try again.', 'error');
      return false;
    }

    await WebBrowser.openBrowserAsync(portalUrl);
    return true;
  } catch (err: any) {
    logger.error('Billing portal error:', err);
    toast(err?.message || 'Could not load billing portal.', 'error');
    return false;
  }
}

export async function restoreBillingPurchases({ queryClient }: BillingMutationOptions = {}) {
  try {
    const res = await iapService.restorePurchases();
    await invalidateBillingQueries(queryClient);
    if (res.restoredCount > 0) {
      toast(`Restored ${res.restoredCount} purchase${res.restoredCount > 1 ? 's' : ''}.`, 'success');
      return true;
    } else {
      toast('No active subscriptions found to restore.', 'info');
      return false;
    }
  } catch (err: any) {
    logger.error('Restore purchases error:', err);
    toast(err?.message || 'Could not restore purchases.', 'error');
    return false;
  }
}

export async function redeemBillingPromo(code: string, { queryClient }: BillingMutationOptions = {}) {
  try {
    await post(endpoint.billingPromoRedeem, { code });
    toast('Promo code applied.', 'success');
    await invalidateBillingQueries(queryClient);
    return true;
  } catch (err: any) {
    logger.error('Promo redeem error:', err);
    toast(err?.message || 'Could not redeem promo code.', 'error');
    return false;
  }
}

export async function cancelBillingSubscription(
  { queryClient }: BillingMutationOptions = {},
  feedback?: BillingCancellationFeedback,
) {
  try {
    await post(endpoint.billingCancel, feedback ?? {});
    toast('Your subscription cancellation has been scheduled.', 'success');
    await invalidateBillingQueries(queryClient);
    return true;
  } catch (err: any) {
    logger.error('Cancel subscription error:', err);
    toast(err?.message || 'Could not cancel subscription.', 'error');
    return false;
  }
}

export async function resumeBillingSubscription({ queryClient }: BillingMutationOptions = {}) {
  try {
    await post(endpoint.billingResume, {});
    toast('Subscription resumed.', 'success');
    await invalidateBillingQueries(queryClient);
    return true;
  } catch (err: any) {
    logger.error('Resume subscription error:', err);
    toast(err?.message || 'Could not resume subscription.', 'error');
    return false;
  }
}
