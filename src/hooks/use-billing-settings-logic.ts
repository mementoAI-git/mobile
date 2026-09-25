import { useState } from 'react';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import dayjs from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/Toast';
import { useUiStore } from '@/store';
import { useSubscription } from '@/hooks/queries/use-subscription';
import { useBillingInvoices, useBillingUsage } from '@/hooks/queries/use-billing';
import {
  openBillingPortal,
  redeemBillingPromo,
  resumeBillingSubscription,
  restoreBillingPurchases,
} from '@/features/settings/billing-flow';
import { iapService } from '@/features/billing/iap-service';

export function useBillingSettingsLogic() {
  const router = useRouter();
  const [activeTab, setActiveTabState] = useState<'overview' | 'invoices'>('overview');
  const { summary, isLoading: subLoading, isProOrAbove, refetch: refetchSub } = useSubscription();
  const { data: invoices = [], isLoading: invoicesLoading, refetch: refetchInvoices } = useBillingInvoices(activeTab === 'invoices');
  const { data: usage, isLoading: usageLoading, refetch: refetchUsage } = useBillingUsage();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const openSheet = useUiStore((state) => state.openSheet);

  const [promo, setPromo] = useState('');
  const [promoBusy, setPromoBusy] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const refreshAll = async () => {
    await Promise.all([refetchSub(), refetchInvoices(), refetchUsage()]);
  };

  const setActiveTab = (tab: 'overview' | 'invoices') => {
    Haptics.selectionAsync();
    setActiveTabState(tab);
  };

  const handleRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    try {
      await refreshAll();
    } finally {
      setRefreshing(false);
    }
  };

  const renewLabel = () => {
    if (!summary) return '—';
    if (summary.trial_ends_at && summary.status === 'trialing') {
      const d = dayjs(summary.trial_ends_at);
      return d.isValid() ? `Trial ends ${d.format('MMM D, YYYY')}` : 'Trial active';
    }
    if (summary.current_period_end) {
      const d = dayjs(summary.current_period_end);
      return d.isValid() ? `Renews ${d.format('MMM D, YYYY')}` : '—';
    }
    return '—';
  };

  const [restoreBusy, setRestoreBusy] = useState(false);

  const handleUpgrade = () => {
    Haptics.selectionAsync();
    router.push('/pricing');
  };

  const handlePortal = async () => {
    if (!isProOrAbove) {
      handleUpgrade();
      return;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPortalBusy(true);
      const opened = await openBillingPortal({
        returnPath: '/settings/billing',
        provider: summary?.provider,
      });
      if (opened) await refreshAll();
    } finally {
      setPortalBusy(false);
    }
  };

  const handleRestore = async () => {
    Haptics.selectionAsync();
    setRestoreBusy(true);
    try {
      await restoreBillingPurchases({ queryClient });
      await refreshAll();
    } finally {
      setRestoreBusy(false);
    }
  };

  const handlePromo = async () => {
    const code = promo.trim();
    if (!code) {
      toast('Please enter a promo code first.', 'error');
      return;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPromoBusy(true);
      const success = await redeemBillingPromo(code, { queryClient });
      if (success) {
        setPromo('');
        await refreshAll();
      }
    } finally {
      setPromoBusy(false);
    }
  };

  const handleCancel = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (summary?.provider === 'apple' || summary?.provider === 'google') {
      void iapService.openSubscriptionManagement();
      return;
    }
    openSheet('cancel-subscription-confirmation');
  };

  const handleResume = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setResumeBusy(true);
      const success = await resumeBillingSubscription({ queryClient });
      if (success) await refreshAll();
    } finally {
      setResumeBusy(false);
    }
  };

  const isCancelled = summary?.cancel_at_period_end === true
    || summary?.status === 'cancelled'
    || summary?.status === 'paused';

  return {
    summary,
    subLoading,
    isProOrAbove,
    invoices,
    invoicesLoading,
    usage,
    usageLoading,
    promo,
    setPromo,
    promoBusy,
    portalBusy,
    resumeBusy,
    handleRefresh,
    refreshing,
    renewLabel,
    handlePortal,
    handlePromo,
    handleCancel,
    handleResume,
    isCancelled,
    activeTab,
    setActiveTab,
    handleUpgrade,
    handleRestore,
    restoreBusy,
  };
}
