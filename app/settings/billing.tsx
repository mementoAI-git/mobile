/**
 * Billing — the mobile port of web `components/modal/settings/billing.tsx`:
 * plan card with its renewal date, storage and a promo code, plus an Invoices tab. Mobile
 * leaves out web's billing details and payment methods: purchases here go through
 * the App Store or Google Play, which keep them, and web subscribers edit them on
 * the website. App Store and Google Play subscribers get a link to the store.
 * Cancelling, resuming and restoring purchases happen on the Plans page.
 */
import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';
import React, { useCallback } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Button, TextInput } from '@/components/ui';
import { SettingsSubpageHeader } from '@/components/settings/SettingsSubpageHeader';
import {
  BillingInvoicesPanel,
  BillingStorageCard,
  BillingTabs,
} from '@/components/billing';
import { PlanSummaryBanner } from '@/components/subscription/PlanSummaryBanner';
import { ProPlanCard } from '@/components/subscription/ProPlanCard';
import type { ThemeColors } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { billingProviderName } from '@/features/billing/plan-state';
import { getStoragePresentation } from '@/features/settings/billing-storage';
import { useBillingSettingsLogic } from '@/hooks/use-billing-settings-logic';

const DEFAULT_USAGE = {
  storage_used_bytes: 0,
};

export default function BillingSettingsScreen() {
  const COLORS = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const router = useRouter();
  const {
    summary, subLoading, isProOrAbove, invoices, invoicesLoading, usage,
    handleRefresh, refreshing, activeTab, setActiveTab, handleUpgrade,
    periodLabel, openStoreManagement, storeBilled,
    promo, setPromo, promoBusy, handlePromo,
  } = useBillingSettingsLogic();

  const storage = getStoragePresentation(usage ?? DEFAULT_USAGE, isProOrAbove);
  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  }, [router]);


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <SettingsSubpageHeader title="Billing" onBack={handleBack} />

      <BillingTabs active={activeTab} onChange={setActiveTab} />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.brand} />}
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 48 }}
      >
        {activeTab === 'overview' ? (
          <View style={styles.stack}>
            {/* Paid plans use web's neutral Pro card; free keeps the upgrade banner. */}
            {isProOrAbove ? (
              <ProPlanCard
                tier={summary?.tier}
                status={summary?.status}
                periodLabel={periodLabel}
                onManage={handleUpgrade}
              />
            ) : (
              <PlanSummaryBanner
                isProOrAbove={false}
                subscriptionKnown={Boolean(summary) && !subLoading}
                onPress={handleUpgrade}
                tier={summary?.tier}
                status={summary?.status}
                provider={summary?.provider}
              />
            )}
            <BillingStorageCard storage={storage} />

            {storeBilled ? (
              <View style={styles.card}>
                <Text style={[TYPE.bodyStrong, { color: COLORS.textStrong }]}>Payment details</Text>
                <Text style={[TYPE.bodySmall, { color: COLORS.textBase, marginTop: 4 }]}>
                  {`Your payment details are managed in ${billingProviderName(summary?.provider)}.`}
                </Text>
                <Button
                  variant="secondary"
                  size="md"
                  rounded="full"
                  className="mt-4 self-start"
                  onPress={openStoreManagement}
                >
                  {`Open ${billingProviderName(summary?.provider)}`}
                </Button>
              </View>
            ) : null}
          </View>
        ) : (
          <BillingInvoicesPanel invoices={invoices} loading={invoicesLoading} />
        )}

        {/* Promo code sits on Overview only; Invoices is just the invoice list. */}
        {activeTab === 'overview' ? (
          <View style={[styles.card, styles.promo]}>
            <Text style={[TYPE.bodyStrong, { color: COLORS.textStrong }]}>Promo code</Text>
            <Text style={[TYPE.bodySmall, { color: COLORS.textBase, marginTop: 4 }]}>
              Have a promo code? Apply it to your account.
            </Text>
            <View style={{ marginTop: 16, gap: 12 }}>
              <TextInput bordered
                label="Code"
                value={promo}
                onChangeText={setPromo}
                placeholder="Enter code"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={128}
                editable={!promoBusy}
                returnKeyType="done"
                onSubmitEditing={() => void handlePromo()}
              />
              {/* Lights up (the active fill: white in dark themes) once a code is entered. */}
              <Button
                variant={promo.trim() ? 'ghost' : 'secondary'}
                size="lg"
                rounded="full"
                fullWidth
                className={promo.trim() ? 'bg-active-fill' : undefined}
                textClassName={promo.trim() ? 'text-active-text' : undefined}
                loading={promoBusy}
                disabled={promoBusy || !promo.trim()}
                onPress={() => void handlePromo()}
              >
                Redeem
              </Button>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => ({
  stack: { paddingHorizontal: 16, gap: 16 },
  // Web settings-card, with the Settings card surface and radius.
  card: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: colors.settingsCard,
  },
  promo: { marginHorizontal: 16, marginTop: 16 },
});
