/**
 * Plans — the mobile port of web `src/features/pricing/pricing-overlay.tsx`:
 * a heading, then the Free and Pro cards stacked, then the plan note and the
 * Cancel / Keep plan row. Every label and action comes from `getPlanState`
 * (web `plan-state.ts`), extended for App Store and Google Play billing.
 * Restore Purchases and the store disclosure stay at the bottom, as the stores require.
 */
import React, { useCallback, useMemo } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useQueryClient } from '@tanstack/react-query';
import AudioLines from 'lucide-react-native/icons/audio-lines';
import Check from 'lucide-react-native/icons/check';
import HardDrive from 'lucide-react-native/icons/hard-drive';
import Lightbulb from 'lucide-react-native/icons/lightbulb';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import PenLine from 'lucide-react-native/icons/pen-line';
import { Button } from '@/components/ui';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { SettingsSubpageHeader } from '@/components/settings/SettingsSubpageHeader';
import type { ThemeColors } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { getIapDisclosureCopy, getTrialCopy, IAP_LEGAL_URLS, iapService, SUBSCRIBE_LABEL } from '@/features/billing';
import {
  FREE_FEATURES,
  PRO_FEATURES,
  PRO_PRICES,
  getPlanState,
  type BillingInterval,
} from '@/features/billing/plan-state';
import { resumeBillingSubscription } from '@/features/settings/billing-flow';
import { usePricingLogic } from '@/hooks/use-pricing-logic';
import { useSubscription } from '@/hooks/queries/use-subscription';
import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';
import { safeBack } from '@/lib/utils';
import { useUiStore } from '@/store';

const FEATURE_ICONS: Record<string, typeof Check> = {
  'Add stories, journals, and thoughts': PenLine,
  'Core chat and memories': MessageCircle,
  'Memory insights': Lightbulb,
  'Standard uploads and storage (200 MB)': HardDrive,
  'Voice mode conversations': AudioLines,
  'Bigger storage (10 GB)': HardDrive,
};

function PlanFeatures({ items, accent = false }: { items: readonly string[]; accent?: boolean }) {
  const colors = useThemeColors();
  return (
    <View style={{ gap: 12 }}>
      {items.map((item) => {
        const Icon = FEATURE_ICONS[item] ?? Check;
        return (
          <View key={item} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <Icon size={16} color={accent ? colors.brand : colors.textWeak} style={{ marginTop: 3 }} />
            <Text style={[TYPE.body, { color: colors.textStrong, flex: 1 }]}>{item}</Text>
          </View>
        );
      })}
    </View>
  );
}

const formatUsd = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

export default function ManagePlanScreen() {
  const colors = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const queryClient = useQueryClient();
  const {
    interval: selectedInterval,
    changeInterval,
    handleCheckout,
    handleRestore,
    products,
    purchaseAvailable,
    router,
    loading: checkoutLoading,
    restoring,
  } = usePricingLogic();
  const { summary, isLoading, error, refetch } = useSubscription();
  const [resuming, setResuming] = React.useState(false);

  const selectedProduct = products?.[selectedInterval];
  /** Store checkout: promise a trial only when StoreKit offers one this Apple ID can redeem. */
  const trialCopy = useMemo(() => (selectedProduct ? getTrialCopy({
    platform: Platform.OS,
    freeTrial: selectedProduct.freeTrial,
    eligible: selectedProduct.introOfferEligible,
    storeAvailable: selectedProduct.storeAvailable,
    localizedPrice: selectedProduct.localizedPrice,
    interval: selectedProduct.interval,
  }) : null), [selectedProduct]);
  const storeBilled = Platform.OS === 'ios' || Platform.OS === 'android';

  const plan = useMemo(() => getPlanState({
    summary,
    loading: isLoading,
    error,
    selectedInterval,
    canCheckout: purchaseAvailable,
    upgradeLabel: storeBilled ? trialCopy?.label ?? SUBSCRIBE_LABEL : undefined,
  }), [summary, isLoading, error, selectedInterval, purchaseAvailable, storeBilled, trialCopy]);
  const interval = plan.interval;
  const trialDisclosure = plan.pro.action === 'checkout' && plan.pro.label === trialCopy?.label
    ? trialCopy.disclosure
    : null;
  const busy = checkoutLoading || resuming;
  const price = products?.[interval]?.storeAvailable
    ? products[interval].localizedPrice
    : formatUsd(PRO_PRICES[interval]);

  const back = useCallback(() => { Haptics.selectionAsync(); safeBack(router, '/settings/billing'); }, [router]);

  /** Store billing is changed in the store; web billing in the web billing portal. */
  const openManagement = useCallback(async () => {
    if (summary?.provider === 'apple' || summary?.provider === 'google') {
      await iapService.openSubscriptionManagement(undefined, summary.provider);
      return;
    }
    const { openBillingPortal } = await import('@/features/settings/billing-flow');
    await openBillingPortal({ returnPath: '/settings/billing', provider: 'polar' });
  }, [summary?.provider]);

  const runProAction = useCallback(async () => {
    if (!plan.pro.action || busy) return;
    if (plan.pro.action === 'checkout') {
      await handleCheckout('pro');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await openManagement();
  }, [busy, handleCheckout, openManagement, plan.pro.action]);

  const requestCancellation = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (summary?.provider === 'apple' || summary?.provider === 'google') {
      void iapService.openSubscriptionManagement();
      return;
    }
    useUiStore.getState().openSheet('cancel-subscription-confirmation');
  }, [summary?.provider]);

  const runCancelRow = useCallback(async () => {
    const action = plan.cancelRow?.action;
    if (!action || busy) return;
    if (action === 'cancel') {
      requestCancellation();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (action === 'store') {
      await openManagement();
      return;
    }
    setResuming(true);
    try {
      await resumeBillingSubscription({ queryClient });
      await refetch();
    } finally {
      setResuming(false);
    }
  }, [busy, openManagement, plan.cancelRow?.action, queryClient, refetch, requestCancellation]);

  const selectInterval = useCallback((next: BillingInterval) => {
    if (plan.intervalControl !== 'enabled' || busy) return;
    changeInterval(next);
  }, [busy, changeInterval, plan.intervalControl]);

  const openTerms = useCallback(() => {
    void Haptics.selectionAsync();
    void WebBrowser.openBrowserAsync(IAP_LEGAL_URLS.terms);
  }, []);
  const openPrivacy = useCallback(() => {
    void Haptics.selectionAsync();
    void WebBrowser.openBrowserAsync(IAP_LEGAL_URLS.privacy);
  }, []);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <SettingsSubpageHeader title="My" accent="plan" onBack={back} />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        alwaysBounceVertical
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 56, gap: 24 }}
      >
        <Animated.Text entering={FadeInDown.duration(600)} accessibilityRole="header" style={styles.heading}>
          Plans that grow with your memories
        </Animated.Text>

        {/* ── Free ── */}
        <Animated.View entering={FadeInDown.duration(600).delay(100)} style={styles.plan}>
          <View style={styles.planHeading}>
            <View style={styles.planHeader}>
              <Text style={styles.planTitle}>Free</Text>
            </View>
            <Text style={styles.planDescription}>Capture and reflect at your own pace.</Text>
          </View>
          <Button
            variant="outline"
            size="lg"
            rounded="full"
            fullWidth
            disabled={!plan.free.canDowngrade || busy}
            onPress={requestCancellation}
          >
            {plan.free.label}
          </Button>
          <View style={styles.priceRow}>
            <Text style={styles.price}>$0</Text>
            <Text style={styles.pricePeriod}>/ month</Text>
          </View>
          <PlanFeatures items={FREE_FEATURES} />
        </Animated.View>

        {/* ── Pro ── */}
        <Animated.View entering={FadeInDown.duration(600).delay(200)} style={[styles.plan, styles.proPlan]}>
          {/* Web: brand mixed 4% → 20% into the card surface. */}
          <LinearGradient
            colors={[colors.brandSubtle, colors.brandTint]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            pointerEvents="none"
            style={styles.proWash}
          />
          <View style={styles.planHeading}>
            <View style={styles.planHeader}>
              <Text style={styles.planTitle}>Pro</Text>
              {plan.intervalControl !== 'hidden' && (
                <View accessibilityRole="radiogroup" accessibilityLabel="Billing period" style={styles.intervalTrack}>
                  {(['monthly', 'annual'] as const).map((value) => {
                    const selected = interval === value;
                    return (
                      <TouchableOpacity
                        key={value}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected, disabled: plan.intervalControl === 'disabled' || busy }}
                        activeOpacity={0.8}
                        disabled={plan.intervalControl === 'disabled' || busy}
                        onPress={() => selectInterval(value)}
                        hitSlop={{ top: 6, bottom: 6 }}
                        style={[styles.intervalItem, selected && styles.intervalItemActive]}
                      >
                        <Text style={[styles.intervalText, selected && styles.intervalTextActive]}>
                          {value === 'monthly' ? 'Monthly' : 'Annual'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
            <Text style={styles.planDescription}>For users who want to benefit more.</Text>
          </View>
          <Button
            variant="ghost"
            size="lg"
            rounded="full"
            fullWidth
            className="bg-active-fill"
            textClassName="text-active-text"
            loading={busy && plan.pro.action !== null}
            disabled={!plan.pro.action || busy}
            onPress={() => void runProAction()}
          >
            {plan.pro.label}
          </Button>
          {trialDisclosure ? <Text style={styles.trialDisclosure}>{trialDisclosure}</Text> : null}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{price}</Text>
            <Text style={styles.pricePeriod}>/ {interval === 'monthly' ? 'month' : 'year'}</Text>
          </View>
          <PlanFeatures items={PRO_FEATURES} accent />
        </Animated.View>

        {plan.note ? <Text style={styles.note}>{plan.note}</Text> : null}

        {plan.cancelRow ? (
          <View style={styles.cancelRow}>
            <View style={{ gap: 4 }}>
              <Text style={[TYPE.label, { color: colors.textStrong }]}>{plan.cancelRow.title}</Text>
              <Text style={[TYPE.bodySmall, { color: colors.textBase }]}>{plan.cancelRow.body}</Text>
            </View>
            {plan.cancelRow.action === 'cancel' ? (
              <Button
                variant="ghost"
                size="md"
                rounded="full"
                className="self-start bg-error-weak"
                textClassName="text-error-strong"
                disabled={busy || isLoading || Boolean(error)}
                onPress={() => void runCancelRow()}
              >
                {plan.cancelRow.buttonLabel}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="md"
                rounded="full"
                className="self-start"
                loading={resuming}
                disabled={busy || isLoading || Boolean(error)}
                onPress={() => void runCancelRow()}
              >
                {plan.cancelRow.buttonLabel}
              </Button>
            )}
          </View>
        ) : null}

        {/* Restore Purchases: required by App Store review (guideline 3.1.1) for subscriptions. */}
        <Button variant="secondary" size="lg" rounded="full" fullWidth loading={restoring} onPress={handleRestore}>
          Restore Purchases
        </Button>

        {/* Store disclosure with Terms and Privacy links: required by the App Store and Google Play. */}
        <View style={styles.legal}>
          <Text style={[TYPE.metadata, { color: colors.textWeak, textAlign: 'center' }]}>
            {getIapDisclosureCopy()}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 16 }}>
            <TouchableOpacity onPress={openTerms} accessibilityRole="link">
              <Text className="underline" style={[TYPE.metadata, { color: colors.textBase }]}>Terms of Use</Text>
            </TouchableOpacity>
            <Text style={[TYPE.metadata, { color: colors.textWeak }]}>•</Text>
            <TouchableOpacity onPress={openPrivacy} accessibilityRole="link">
              <Text className="underline" style={[TYPE.metadata, { color: colors.textBase }]}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  heading: {
    ...TYPE.screenTitle,
    color: colors.textStrong,
    textAlign: 'center' as const,
    paddingHorizontal: 8,
  },
  // Web .pricing-plan: 24px radius, the insights card surface, a weak stroke.
  plan: {
    gap: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.strokeWeak,
    backgroundColor: colors.fillWeak,
    paddingHorizontal: 24,
    paddingVertical: 28,
    overflow: 'hidden' as const,
  },
  // Web .pricing-plan-pro: a brand wash and a 1.5px brand stroke.
  proPlan: {
    borderWidth: 1.5,
    borderColor: colors.brandTint,
  },
  proWash: {
    position: 'absolute' as const,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  planHeader: {
    minHeight: 40,
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 12,
  },
  // Web CardHeader: the title row and its description sit close together.
  planHeading: { gap: 6 },
  planTitle: { ...TYPE.screenTitle, color: colors.textStrong },
  planDescription: { ...TYPE.bodySmall, color: colors.textBase },
  priceRow: { flexDirection: 'row' as const, alignItems: 'baseline' as const, gap: 8 },
  price: { ...TYPE.planPrice, color: colors.textStrong, letterSpacing: -0.5 },
  pricePeriod: { ...TYPE.body, color: colors.textBase },
  // Web billing period toggle: 176px pill, fill-neutral-weak track, active tab fill.
  intervalTrack: {
    width: 176,
    flexDirection: 'row' as const,
    borderRadius: 999,
    padding: 4,
    backgroundColor: colors.fillWeak,
  },
  intervalItem: {
    flex: 1,
    height: 32,
    borderRadius: 999,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  intervalItemActive: { backgroundColor: colors.activeFill },
  intervalText: { ...TYPE.buttonSmall, color: colors.textBase },
  intervalTextActive: { color: colors.activeText },
  note: { ...TYPE.bodySmall, color: colors.textBase },
  trialDisclosure: { ...TYPE.bodySmall, color: colors.textBase, textAlign: 'center' as const, marginTop: -12 },
  // Web insights-card: 12px radius, 20px padding.
  cancelRow: {
    gap: 12,
    borderRadius: 12,
    padding: 20,
    backgroundColor: colors.fillWeak,
  },
  legal: {
    paddingTop: 16,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: colors.strokeWeaker,
  },
});
