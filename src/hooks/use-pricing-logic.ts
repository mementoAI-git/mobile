import { useState } from 'react';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { launchBillingCheckout, restoreBillingPurchases } from '@/features/settings/billing-flow';
import { useIAP } from '@/features/billing/use-iap';

export type BillingInterval = 'monthly' | 'annual';
export type Currency = 'USD' | 'NGN';

export const PRICING_TABLE = {
  USD: {
    pro: { monthly: 9.99, annual: 79 },
    legacy: { monthly: 19.99, annual: 179 },
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
  const queryClient = useQueryClient();
  const { products, buySubscription, restorePurchases: iapRestore, purchasing, restoring } = useIAP();
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [loading, setLoading] = useState(false);
  const currency: Currency = 'USD';
  const table = PRICING_TABLE[currency];

  const localizedProduct = products[interval];
  const proPrice = interval === 'annual' ? table.pro.annual / 12 : table.pro.monthly;
  const legacyPrice = interval === 'annual' ? table.legacy.annual / 12 : table.legacy.monthly;

  const handleCheckout = async (tier: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setLoading(true);

      const normalizedTier = tier === 'legacy' ? 'legacy' : 'pro';
      const opened = await launchBillingCheckout({
        tier: normalizedTier,
        interval,
        returnPath: '/settings/billing',
        queryClient,
      });

      if (opened) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    await restoreBillingPurchases({ queryClient });
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
    loading: loading || purchasing,
    restoring,
    proPrice,
    legacyPrice,
    table,
    localizedProduct,
    handleCheckout,
    handleRestore,
    formatMoney,
    router,
  };
}
