import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import dayjs from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/Toast';
import { useSubscription } from '@/hooks/queries/use-subscription';
import { useBillingInvoices, useBillingUsage } from '@/hooks/queries/use-billing';
import {
  cancelBillingSubscription,
  openBillingPortal,
  redeemBillingPromo,
  resumeBillingSubscription,
} from '@/features/settings/billing-flow';

export function useBillingSettingsLogic() {
  const { summary, isLoading: subLoading, isProOrAbove, refetch: refetchSub } = useSubscription();
  const { data: invoices = [], isLoading: invoicesLoading, refetch: refetchInvoices } = useBillingInvoices(isProOrAbove);
  const { data: usage, isLoading: usageLoading, refetch: refetchUsage } = useBillingUsage();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [promo, setPromo] = useState('');
  const [promoBusy, setPromoBusy] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [cancelConfirmVisible, setCancelConfirmVisible] = useState(false);

  const refreshAll = async () => {
    await Promise.all([refetchSub(), refetchInvoices(), refetchUsage()]);
  };

  const handleRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refreshAll();
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

  const handlePortal = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPortalBusy(true);
      await openBillingPortal({ returnPath: '/settings/billing' });
    } finally {
      setPortalBusy(false);
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
    setCancelConfirmVisible(true);
  };

  const confirmCancel = async () => {
    setCancelConfirmVisible(false);
    try {
      setCancelBusy(true);
      const success = await cancelBillingSubscription({ queryClient });
      if (success) await refreshAll();
    } finally {
      setCancelBusy(false);
    }
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

  const isCancelled = summary?.status === 'cancelled';

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
    cancelBusy,
    resumeBusy,
    cancelConfirmVisible,
    setCancelConfirmVisible,
    handleRefresh,
    renewLabel,
    handlePortal,
    handlePromo,
    handleCancel,
    confirmCancel,
    handleResume,
    isCancelled,
  };
}
