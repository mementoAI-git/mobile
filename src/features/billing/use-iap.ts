/**
 * use-iap.ts
 * React hook providing native StoreKit / Google Play Billing state and actions
 */

import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { queryKeys } from '@/constants/query-keys';
import { toast } from '@/components/ui/Toast';
import { logger } from '@/lib/logger';
import { iapService } from './iap-service';
import { FALLBACK_PRODUCTS, generateStoreAccountToken } from './iap-constants';
import type { IAPPlanInterval, IAPProduct } from './iap-types';
import { useSubscription } from '@/hooks/queries/use-subscription';

export function useIAP() {
  const queryClient = useQueryClient();
  const { summary, refetch: refetchSubscription } = useSubscription();
  const [products, setProducts] = useState<Record<IAPPlanInterval, IAPProduct>>(FALLBACK_PRODUCTS);
  const [loading, setLoading] = useState<boolean>(true);
  const [purchasing, setPurchasing] = useState<boolean>(false);
  const [restoring, setRestoring] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        const items = await iapService.getProducts();
        if (!isMounted) return;

        const productMap: Record<IAPPlanInterval, IAPProduct> = { ...FALLBACK_PRODUCTS };
        for (const item of items) {
          productMap[item.interval] = item;
        }
        setProducts(productMap);
      } catch (err) {
        logger.warn('[useIAP] loadProducts error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const buySubscription = useCallback(
    async (interval: IAPPlanInterval): Promise<boolean> => {
      try {
        setPurchasing(true);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        let storeAccountToken = summary?.store_account_token;
        if (!storeAccountToken) {
          const refreshed = await refetchSubscription();
          storeAccountToken = refreshed.data?.store_account_token;
        }
        if (!storeAccountToken) {
          storeAccountToken = generateStoreAccountToken();
        }
        const started = await iapService.requestSubscriptionPurchase(
          interval,
          storeAccountToken,
        );
        if (started) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: queryKeys.subscription }),
            queryClient.invalidateQueries({ queryKey: queryKeys.billingUsage }),
            queryClient.invalidateQueries({ queryKey: queryKeys.profile }),
          ]);
        }
        return started;
      } catch (err: any) {
        logger.error('[useIAP] buySubscription error:', err);
        const msg = err?.message || 'Could not complete purchase. Please try again.';
        toast(msg, 'error');
        return false;
      } finally {
        setPurchasing(false);
      }
    },
    [queryClient, refetchSubscription, summary?.store_account_token],
  );

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    try {
      setRestoring(true);
      void Haptics.selectionAsync();

      const result = await iapService.restorePurchases();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.subscription }),
        queryClient.invalidateQueries({ queryKey: queryKeys.billingUsage }),
        queryClient.invalidateQueries({ queryKey: queryKeys.profile }),
      ]);

      if (result.restoredCount > 0) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast(`Restored ${result.restoredCount} purchase${result.restoredCount > 1 ? 's' : ''}.`, 'success');
        return true;
      } else {
        toast('No active subscriptions found to restore.', 'info');
        return false;
      }
    } catch (err: any) {
      logger.error('[useIAP] restorePurchases error:', err);
      toast(err?.message || 'Could not restore purchases.', 'error');
      return false;
    } finally {
      setRestoring(false);
    }
  }, [queryClient]);

  const openManagement = useCallback(async () => {
    try {
      void Haptics.selectionAsync();
      await iapService.openSubscriptionManagement();
    } catch (err: any) {
      logger.error('[useIAP] openManagement error:', err);
      toast('Could not open subscription settings.', 'error');
    }
  }, []);

  return {
    products,
    loading,
    purchasing,
    restoring,
    buySubscription,
    restorePurchases,
    openManagement,
  };
}
