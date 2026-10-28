import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { useCallback } from 'react';
import { ImageBackground, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui';
import { SettingsSubpageHeader } from '@/components/settings/SettingsSubpageHeader';
import {
  BillingInvoicesPanel,
  BillingStorageCard,
  BillingTabs,
} from '@/components/billing';
import { PlanSummaryBanner } from '@/components/subscription/PlanSummaryBanner';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { getStoragePresentation } from '@/features/settings/billing-storage';
import { useBillingSettingsLogic } from '@/hooks/use-billing-settings-logic';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');
const DEFAULT_USAGE = {
  storage_used_bytes: 0,
};

export default function BillingSettingsScreen() {
  const COLORS = useThemeColors();
  const router = useRouter();
  const {
    summary, subLoading, isProOrAbove, invoices, invoicesLoading, usage, portalBusy,
    resumeBusy,
    handleRefresh, refreshing, handlePortal, handleCancel, handleResume,
    isCancelled, activeTab, setActiveTab, handleUpgrade,
    handleRestore, restoreBusy,
  } = useBillingSettingsLogic();

  const storage = getStoragePresentation(usage ?? DEFAULT_USAGE, isProOrAbove);
  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  }, [router]);
  const handlePlanAction = handleUpgrade;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <SettingsSubpageHeader title="Billing" onBack={handleBack} />

      <BillingTabs active={activeTab} onChange={setActiveTab} />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.brand} />}
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 48 }}
      >
        <ImageBackground source={PATTERN} className="absolute inset-0" style={{ opacity: 0.02 }} resizeMode="repeat" />
        {activeTab === 'overview' ? (
          <View className="px-4 pb-6">
            <PlanSummaryBanner
              isProOrAbove={isProOrAbove}
              subscriptionKnown={Boolean(summary) && !subLoading}
              onPress={handlePlanAction}
              loading={isProOrAbove && portalBusy}
              tier={summary?.tier}
              status={summary?.status}
              cancelAtPeriodEnd={summary?.cancel_at_period_end}
              provider={summary?.provider}
            />
            <View className="mt-4">
              <BillingStorageCard storage={storage} />
            </View>

            {/* <View className="h-px bg-stroke-weak my-6" />
            <View className="rounded-[24px] bg-fill-weaker p-5">
              <Text style={{...TYPE.bodyStrong, color: COLORS.textStrong}}>
                Billing is managed securely by {summary?.provider === 'apple' ? 'Apple' : summary?.provider === 'google' ? 'Google Play' : 'Polar'}.
              </Text>
              <Text className="mt-2" style={{...TYPE.bodySmall, color: COLORS.textWeak}}>
                Update payment details, view receipts, or change renewal settings with your billing provider.
              </Text>
              <Button variant="outline" size="lg" className="mt-4" onPress={handlePortal} loading={portalBusy}>
                Manage billing
              </Button>
            </View> */}

            {isProOrAbove && (
              <View className="pt-6 pb-2 items-center">
                {!isCancelled ? <Button variant="ghost" size="lg" onPress={handleCancel} textClassName="text-error-strong">Cancel subscription</Button> : null}
                {(summary?.cancel_at_period_end || summary?.status === 'paused') && (
                  <Button variant="outline" size="lg" loading={resumeBusy} onPress={handleResume}>Resume subscription</Button>
                )}
              </View>
            )}

            <View className="pt-4 pb-6 items-center">
              <Button
                variant="ghost"
                size="md"
                loading={restoreBusy}
                onPress={handleRestore}
                textClassName="text-text-base"
              >
                Restore Purchases
              </Button>
            </View>
          </View>
        ) : <BillingInvoicesPanel invoices={invoices} loading={invoicesLoading} />}
      </ScrollView>

    </SafeAreaView>
  );
}
