import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { QueryClient } from '@tanstack/react-query';
import { post } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import { logger } from '@/lib/logger';
import { toast } from '@/components/ui/Toast';
import { extractBillingUrl } from './billing-adapters';

export type BillingCheckoutTier = 'pro' | 'legacy';
export type BillingCheckoutInterval = 'monthly' | 'annual' | 'lifetime';

interface LaunchBillingCheckoutOptions {
  tier: BillingCheckoutTier;
  interval: BillingCheckoutInterval;
  returnPath: string;
  queryClient?: QueryClient;
}

interface OpenBillingPortalOptions {
  returnPath: string;
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
  ]);
}

export async function launchBillingCheckout({
  tier,
  interval,
  returnPath,
  queryClient,
}: LaunchBillingCheckoutOptions) {
  const redirectUrl = Linking.createURL(returnPath);
  try {
    const res = await post(endpoint.billingCheckout, {
      success_url: redirectUrl,
      cancel_url: redirectUrl,
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

export async function openBillingPortal({ returnPath }: OpenBillingPortalOptions) {
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

export async function cancelBillingSubscription({ queryClient }: BillingMutationOptions = {}) {
  try {
    await post(endpoint.billingCancel, {});
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
