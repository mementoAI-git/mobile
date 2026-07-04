import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, ImageBackground, ActivityIndicator, Text} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, Sparkles, Play, Pause } from 'lucide-react-native';
import { UiCreditCard01, UiReceipt, UiRefreshCw05, UiLinkExternal01, UiStars01 } from '@/components/ui/icons/SettingsIcons';
import { Button, TextInput, Card, Badge, ConfirmDialog } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { COLORS, FONTS } from '@/constants/tokens';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useSubscription } from '@/hooks/queries/use-subscription';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { get, post } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import dayjs from 'dayjs';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');

interface Invoice {
  url?: string;
  label?: string;
}

interface UsageLimit {
  storage_used_bytes: number;
  storage_limit_bytes: number;
  beneficiary_count: number;
  timed_message_count: number;
}

function formatBytes(bytes?: number, decimals = 1) {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return '0 B';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

interface ExtendedSubscriptionSummary {
  tier: 'free' | 'pro' | 'legacy';
  status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'paused' | 'canceled';
  usage?: any;
  trial_ends_at?: string | null;
  current_period_end?: string | null;
}

export default function BillingSettingsScreen() {
  const { summary: originalSummary, isLoading: subLoading, isProOrAbove, refetch: refetchSub } = useSubscription();
  const summary = originalSummary as ExtendedSubscriptionSummary | undefined;
  const [promo, setPromo] = useState('');
  const [promoBusy, setPromoBusy] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [cancelConfirmVisible, setCancelConfirmVisible] = useState(false);
  const { toast } = useToast();

  // 1. Invoices Query
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: () => get<{ data: Invoice[] }>(endpoint.billingInvoices).then((r) => r.data?.data || []),
    enabled: isProOrAbove,
    staleTime: 30_000,
  });

  // 2. Usage Query
  const { data: usage, isLoading: usageLoading } = useQuery<UsageLimit | null>({
    queryKey: ['billing-usage'],
    queryFn: () => get<{ data: UsageLimit }>(endpoint.billingUsage).then((r) => r.data?.data ?? null),
    staleTime: 30_000,
  });

  // Refetch everything
  const handleRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetchSub();
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

  // 3. Manage Billing (Open Customer Portal)
  const handlePortal = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPortalBusy(true);
      const redirectUrl = Linking.createURL('/settings/billing');
      const res = (await post(endpoint.billingPortal, {
        return_url: redirectUrl,
      })) as any;
      if (res?.data?.portal_url) {
        await WebBrowser.openBrowserAsync(res.data.portal_url);
      } else {
        toast('Could not open billing portal. Please try again.', 'error');
      }
    } catch (err: any) {
      toast(err?.message || 'Could not load billing portal.', 'error');
    } finally {
      setPortalBusy(false);
    }
  };

  // 4. Redeem Promo Code
  const handlePromo = async () => {
    const code = promo.trim();
    if (!code) {
      toast('Please enter a promo code first.', 'error');
      return;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPromoBusy(true);
      const res = (await post(endpoint.billingPromoRedeem, { code })) as any;
      if (res?.data?.success || res?.success) {
        toast('Promo code successfully applied!', 'success');
        setPromo('');
        await refetchSub();
      } else {
        toast(typeof res?.data?.message === 'string' ? res.data.message : 'Could not redeem promo code.', 'error');
      }
    } catch (err: any) {
      toast(err?.message || 'Could not redeem promo code.', 'error');
    } finally {
      setPromoBusy(false);
    }
  };

  // 5. Cancel Subscription — shows custom ConfirmDialog
  const handleCancel = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setCancelConfirmVisible(true);
  };

  const confirmCancel = async () => {
    setCancelConfirmVisible(false);
    try {
      setCancelBusy(true);
      await post(endpoint.billingCancel, {});
      toast('Your subscription cancellation has been scheduled.', 'success');
      await refetchSub();
    } catch (err: any) {
      toast(err?.message || 'Could not cancel subscription.', 'error');
    } finally {
      setCancelBusy(false);
    }
  };

  // 6. Resume Subscription
  const handleResume = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setResumeBusy(true);
      await post(endpoint.billingResume, {});
      toast('Your subscription has been successfully resumed!', 'success');
      await refetchSub();
    } catch (err: any) {
      toast(err?.message || 'Could not resume subscription.', 'error');
    } finally {
      setResumeBusy(false);
    }
  };

  const router = useRouter();
  const isCancelled = summary?.status === 'cancelled' || summary?.status === 'canceled';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); if (router.canGoBack()) { router.back(); } else { router.replace('/settings' as any); } }}
            className="size-11 rounded-full bg-fill-weaker border border-stroke-weaker items-center justify-center"
          >
            <ChevronLeft size={22} color={COLORS.textBase} />
          </TouchableOpacity>
          <View>
            <Text
              className="text-[28px] text-text-strong"
              style={{ fontFamily: FONTS.serif }}
            >
              Billing
            </Text>
            <Text className="text-[13px] text-text-weak" style={{ fontFamily: FONTS.sans }}>
              Manage your plan and payments
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleRefresh}
          className="size-11 rounded-full bg-fill-weaker border border-stroke-weaker items-center justify-center"
        >
          <UiRefreshCw05 size={16} color={COLORS.textBase} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-16">
        <ImageBackground source={PATTERN} className="absolute inset-0 opacity-[0.03]" resizeMode="repeat" />

        <View className="px-6 gap-6">
          {/* 1. Subscription Overview Card */}
          <Animated.View entering={FadeInDown.duration(600)}>
            <View className="bg-white rounded-[32px] p-6">
              <View className="flex-row items-center gap-4 mb-6">
                <View className="size-12 rounded-2xl bg-brand-tint items-center justify-center">
                  <UiCreditCard01 size={24} color={COLORS.brand} strokeWidth={1.8} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-lg text-text-strong capitalize" style={{ fontFamily: FONTS.sansBold }}>
                      {summary?.tier ?? 'Free Tier'}
                    </Text>
                    {isProOrAbove && (
                      <View className="bg-brand/10 px-2 py-0.5 rounded-full">
                        <Sparkles size={10} color={COLORS.brand} />
                      </View>
                    )}
                  </View>
                  <Text className="text-xs text-text-weak leading-relaxed mt-0.5" style={{ fontFamily: FONTS.sans }}>
                    {summary?.status ? `Status: ${summary.status.replace(/_/g, ' ')}` : 'Save infinite memories with Pro'}
                  </Text>
                </View>
              </View>

              {subLoading ? (
                <ActivityIndicator size="small" color={COLORS.brand} className="my-4" />
              ) : (
                <View className="bg-fill-weaker rounded-2xl p-4 gap-3">
                  <View className="flex-row justify-between items-center">
                    <Text className="text-xs text-text-muted uppercase tracking-[2px]" style={{ fontFamily: FONTS.sansBold }}>Billing Cycle</Text>
                    <Text className="text-sm text-text-strong font-medium" style={{ fontFamily: FONTS.sansMedium }}>
                      {renewLabel()}
                    </Text>
                  </View>
                </View>
              )}

              {/* Actions */}
              <View className="flex-row gap-3 mt-6">
                {isProOrAbove && (
                  <TouchableOpacity
                    onPress={handlePortal}
                    disabled={portalBusy}
                    className="flex-1 h-12 rounded-2xl items-center justify-center bg-fill-weaker"
                  >
                    {portalBusy ? (
                      <ActivityIndicator size="small" color={COLORS.brand} />
                    ) : (
                      <Text className="text-sm text-text-strong font-semibold" style={{ fontFamily: FONTS.sansSemi }}>
                        Manage Portal
                      </Text>
                    )}
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => { Haptics.selectionAsync(); Linking.openURL('memento://pricing'); }}
                  className="flex-1 h-12 rounded-2xl bg-brand items-center justify-center"
                >
                  <Text className="text-sm text-white font-bold" style={{ fontFamily: FONTS.sansBold }}>
                    {isProOrAbove ? 'Change Plan' : 'Upgrade to Pro'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Cancel / Resume Triggers */}
              {isProOrAbove && !isCancelled && (
                <TouchableOpacity
                  onPress={handleCancel}
                  disabled={cancelBusy}
                  className="mt-4 py-2 flex-row items-center justify-center gap-1.5"
                >
                  {cancelBusy ? (
                    <ActivityIndicator size="small" color={COLORS.error} />
                  ) : (
                    <>
                      <Pause size={14} color={COLORS.error} />
                      <Text className="text-xs font-semibold" style={{ fontFamily: FONTS.sansSemi, color: COLORS.error }}>
                        Cancel Subscription
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {summary?.status === 'paused' && (
                <TouchableOpacity
                  onPress={handleResume}
                  disabled={resumeBusy}
                  className="mt-4 py-2 flex-row items-center justify-center gap-1.5"
                >
                  {resumeBusy ? (
                    <ActivityIndicator size="small" color={COLORS.brand} />
                  ) : (
                    <>
                      <Play size={14} color={COLORS.brand} />
                      <Text className="text-sm text-brand" style={{ fontFamily: FONTS.sansSemi }}>
                        Resume Subscription
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>

          {/* 2. Usage & Limits Card */}
          {usage && (
            <Animated.View entering={FadeInDown.delay(100).duration(600)}>
              <View className="bg-white rounded-[32px] p-6 gap-6">
                <Text className="text-[11px] text-text-muted uppercase tracking-[2px]" style={{ fontFamily: FONTS.sansBold }}>
                  Storage & Usage
                </Text>

                {/* Storage Progress */}
                <View className="gap-2">
                  <View className="flex-row justify-between items-end">
                    <Text className="text-sm text-text-strong" style={{ fontFamily: FONTS.sansSemi }}>Vault Storage</Text>
                    <Text className="text-xs text-text-weak leading-relaxed" style={{ fontFamily: FONTS.sans }}>
                      {formatBytes(usage.storage_used_bytes)} of {formatBytes(usage.storage_limit_bytes || 5368709120)}
                    </Text>
                  </View>
                  <View className="h-2.5 w-full bg-fill-weaker rounded-full overflow-hidden">
                    <View 
                      className="h-full bg-brand rounded-full" 
                      style={{ 
                        width: `${Math.min(100, ((usage.storage_used_bytes || 0) / (usage.storage_limit_bytes || 5368709120)) * 100)}%` 
                      }} 
                    />
                  </View>
                </View>

                {/* Grid stats */}
                <View className="flex-row gap-4">
                  <View className="flex-1 bg-fill-weaker rounded-2xl p-4">
                    <Text className="text-[10px] text-text-muted uppercase tracking-[2px]" style={{ fontFamily: FONTS.sansBold }}>Trustees</Text>
                    <Text style={{ fontFamily: FONTS.sansBold, fontSize: 28, color: COLORS.textStrong, marginTop: 4, lineHeight: 34 }}>
                      {usage.beneficiary_count ?? 0}
                    </Text>
                  </View>
                  <View className="flex-1 bg-fill-weaker rounded-2xl p-4">
                    <Text className="text-[10px] text-text-muted uppercase tracking-[2px]" style={{ fontFamily: FONTS.sansBold }}>Capsules</Text>
                    <Text style={{ fontFamily: FONTS.sansBold, fontSize: 28, color: COLORS.textStrong, marginTop: 4, lineHeight: 34 }}>
                      {usage.timed_message_count ?? 0}
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          )}

          {/* 3. Promo Code Card */}
          <Animated.View entering={FadeInDown.delay(200).duration(600)}>
            <View className="bg-white rounded-[32px] p-6 gap-5">
              <Text className="text-[11px] text-text-muted uppercase tracking-[2px]" style={{ fontFamily: FONTS.sansBold }}>
                Promo Code
              </Text>

              <View className="flex-row gap-3 items-end">
                <View className="flex-1">
                  <TextInput
                    label="Promo Code"
                    value={promo}
                    onChangeText={setPromo}
                    placeholder="Enter code"
                    autoCapitalize="characters"
                  />
                </View>
                <TouchableOpacity
                  onPress={handlePromo}
                  disabled={promoBusy || !promo.trim()}
                  activeOpacity={0.8}
                  className="h-12 px-6 rounded-2xl bg-brand/10 items-center justify-center"
                >
                  {promoBusy ? (
                    <ActivityIndicator size="small" color={COLORS.brand} />
                  ) : (
                    <Text className="text-sm text-brand font-semibold" style={{ fontFamily: FONTS.sansSemi }}>
                      Redeem
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* 4. Invoices List Card */}
          {isProOrAbove && (
            <Animated.View entering={FadeInDown.delay(300).duration(600)}>
              <View className="bg-white rounded-[32px] p-6 gap-4">
                    <View className="flex-row items-center gap-2">
                        <UiReceipt size={16} color={COLORS.textBase} strokeWidth={1.8} />
                  <Text className="text-[11px] text-text-muted uppercase tracking-[2px]" style={{ fontFamily: FONTS.sansBold }}>
                    Invoices
                  </Text>
                </View>

                {invoicesLoading ? (
                  <ActivityIndicator size="small" color={COLORS.brand} className="my-4" />
                ) : invoices.length > 0 ? (
                  <View className="gap-2.5">
                    {invoices.map((inv, idx) => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => inv.url && WebBrowser.openBrowserAsync(inv.url)}
                        disabled={!inv.url}
                        activeOpacity={0.7}
                        className="flex-row items-center justify-between bg-fill-weaker px-4 py-3.5 rounded-2xl"
                      >
                        <Text className="text-sm text-text-strong font-medium" style={{ fontFamily: FONTS.sansMedium }}>
                          {inv.label || `Invoice #${idx + 1}`}
                        </Text>
                        {inv.url && (
                          <UiLinkExternal01 size={14} color={COLORS.brand} strokeWidth={1.5} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <Text className="text-xs text-text-disabled py-2 leading-relaxed" style={{ fontFamily: FONTS.sans }}>
                    No invoices returned yet. They will appear here when your billing provider processes them.
                  </Text>
                )}
              </View>
            </Animated.View>
          )}
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={cancelConfirmVisible}
        title="Cancel subscription?"
        message="You'll keep access until the end of your current billing cycle. This can be reversed before then."
        onClose={() => setCancelConfirmVisible(false)}
        buttons={[
          { label: 'Cancel plan', variant: 'destructive', onPress: confirmCancel },
          { label: 'Keep my plan', variant: 'ghost', onPress: () => setCancelConfirmVisible(false) },
        ]}
      />
    </SafeAreaView>
  );
}
