import React, { useCallback } from 'react';
import { ImageBackground, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui';
import { SettingsSubpageHeader } from '@/components/settings/SettingsSubpageHeader';
import {
  BillingDetailsSection,
  BillingInvoicesPanel,
  BillingPaymentMethodsSection,
  BillingStorageCard,
  BillingTabs,
} from '@/components/billing';
import { PlanSummaryBanner } from '@/components/subscription/PlanSummaryBanner';
import { COLORS } from '@/constants/tokens';
import { getStoragePresentation } from '@/features/settings/billing-storage';
import { useBillingSettingsLogic } from '@/hooks/use-billing-settings-logic';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');
const DEFAULT_USAGE = {
  storage_used_bytes: 0,
};

export default function BillingSettingsScreen() {
  const router = useRouter();
  const {
    summary, subLoading, isProOrAbove, invoices, invoicesLoading, usage, portalBusy,
    resumeBusy,
    handleRefresh, refreshing, handlePortal, handleCancel, handleResume,
    isCancelled, activeTab, setActiveTab, profile, handleUpgrade,
    handleEditBillingDetails, handleAddPaymentMethod, handleEditPaymentMethod,
  } = useBillingSettingsLogic();

  const storage = getStoragePresentation(usage ?? DEFAULT_USAGE, isProOrAbove);
  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  }, [router]);
  const handlePlanAction = isProOrAbove ? handlePortal : handleUpgrade;

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: COLORS.background}} edges={['top']}>
      <SettingsSubpageHeader title="Billing" onBack={handleBack} />

      <BillingTabs active={activeTab} onChange={setActiveTab} />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.brand} />}
        contentContainerStyle={{paddingTop: 20, paddingBottom: 48}}
      >
        <ImageBackground source={PATTERN} className="absolute inset-0" style={{opacity: 0.02}} resizeMode="repeat" />
        {activeTab === 'overview' ? (
          <View className="px-5 pb-6">
            <PlanSummaryBanner
              isProOrAbove={isProOrAbove}
              subscriptionKnown={Boolean(summary) && !subLoading}
              onPress={handlePlanAction}
              loading={isProOrAbove && portalBusy}
              tier={summary?.tier}
              status={summary?.status}
              cancelAtPeriodEnd={summary?.cancel_at_period_end}
            />
            <View className="mt-4">
              <BillingStorageCard storage={storage} />
            </View>

            {/* Section separator 1 */}
            <View className="h-px bg-stroke-weak my-6" />

            <BillingDetailsSection profile={profile} onEdit={handleEditBillingDetails} />

            {/* Section separator 2 */}
            <View className="h-px bg-stroke-weak my-6" />

            <BillingPaymentMethodsSection methods={profile.paymentMethods} onAdd={handleAddPaymentMethod} onEdit={handleEditPaymentMethod} />

            {isProOrAbove && (
              <View className="pt-6 pb-8 items-center">
                {!isCancelled ? <Button variant="ghost" size="lg" onPress={handleCancel} textClassName="text-error-strong">Cancel subscription</Button> : null}
                {(summary?.cancel_at_period_end || summary?.status === 'paused') && (
                  <Button variant="outline" size="lg" loading={resumeBusy} onPress={handleResume}>Resume subscription</Button>
                )}
              </View>
            )}
          </View>
        ) : <BillingInvoicesPanel invoices={invoices} loading={invoicesLoading} />}
      </ScrollView>

    </SafeAreaView>
  );
}
