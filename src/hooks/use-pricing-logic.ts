import { useState } from 'react';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { post } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { logger } from '@/lib/logger';
import { useToast } from '@/components/ui/Toast';

export type BillingInterval = 'monthly' | 'annual';
export type Currency = 'USD' | 'NGN';

export const PRICING_TABLE = {
  USD: {
    pro: { monthly: 9.99, annual: 79 },
    legacy: { monthly: 19.99, annual: 179, lifetime: 999 },
  },
};

export const DEFERRED_FEATURES = [
  { name: "Weekly insights", tier: "Pro + Legacy", target: "V2" },
  { name: "Advanced privacy controls", tier: "Pro + Legacy", target: "V2" },
  { name: "Memory integrations", tier: "Pro / Legacy", target: "V2" },
  { name: "Legacy vault", tier: "Legacy", target: "V3" },
  { name: "Curator", tier: "Legacy", target: "V3" },
  { name: "50-year hosting guarantee", tier: "Legacy", target: "V3" },
];

export function usePricingLogic() {
  const router = useRouter();
  const { toast } = useToast();
  const [interval, setInterval] = useState<BillingInterval>('annual');
  const [loading, setLoading] = useState(false);
  const currency: Currency = 'USD';
  const table = PRICING_TABLE[currency];

  const proPrice = interval === 'annual' ? table.pro.annual / 12 : table.pro.monthly;
  const legacyPrice = interval === 'annual' ? table.legacy.annual / 12 : table.legacy.monthly;

  const handleCheckout = async (tier: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setLoading(true);

      const redirectUrl = Linking.createURL('/settings/billing');

      const res = await post(endpoint.billingCheckout, {
        success_url: redirectUrl,
        cancel_url: redirectUrl,
        tier: tier.toLowerCase(),
        interval: interval
      });

      if (res?.data?.checkout_url) {
        // Open the secure Polar checkout flow in-app system browser
        await WebBrowser.openBrowserAsync(res.data.checkout_url);
        
        // Success haptics
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        toast('Could not start checkout. Please try again.', 'error');
      }
    } catch (err: any) {
      logger.error('Checkout error:', err);
      toast(err?.message || 'A billing error occurred. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const changeInterval = (newInterval: BillingInterval) => {
    Haptics.selectionAsync();
    setInterval(newInterval);
  };

  return {
    interval,
    changeInterval,
    loading,
    proPrice,
    legacyPrice,
    table,
    handleCheckout,
    formatMoney,
    router,
  };
}
