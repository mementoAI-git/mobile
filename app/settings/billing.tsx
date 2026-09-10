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
  BillingPlanBanner,
  BillingStorageCard,
  BillingTabs,
} from '@/components/billing';
import { COLORS } from '@/constants/tokens';
import { getBillingTierPresentation } from '@/features/settings/billing-presentation';
import { getStoragePresentation } from '@/features/settings/billing-storage';
import { useBillingSettingsLogic } from '@/hooks/use-billing-settings-logic';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');
const REFERENCE_USAGE = {
  storage_used_bytes: 3.5 * 1024 ** 3,
  storage_limit_bytes: 10 * 1024 ** 3,
  remaining_bytes: 6.5 * 1024 ** 3,
  beneficiary_count: 0,
  timed_message_count: 0,
};

export default function BillingSettingsScreen() {
  const router = useRouter();
  const {
    summary, isProOrAbove, invoices, invoicesLoading, usage, portalBusy,
    resumeBusy,
    handleRefresh, handlePortal, handleCancel, handleResume,
    isCancelled, activeTab, setActiveTab, profile, handleUpgrade,
    handleEditBillingDetails, handleAddPaymentMethod, handleEditPaymentMethod,
  } = useBillingSettingsLogic();

  const plan = getBillingTierPresentation(summary?.tier ?? 'free');
  const storage = getStoragePresentation(usage ?? REFERENCE_USAGE, isProOrAbove);
  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  }, [router]);
  const handlePlanAction = plan.action === 'upgrade' ? handleUpgrade : handlePortal;

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: COLORS.background}} edges={['top']}>
      <SettingsSubpageHeader title="Billing" onBack={handleBack} />

      <BillingTabs active={activeTab} onChange={setActiveTab} />
      <ScrollView
        className="mt-6 flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={COLORS.brand} />}
        contentContainerStyle={{paddingBottom: 48}}
      >
        <ImageBackground source={PATTERN} className="absolute inset-0" style={{opacity: 0.03}} resizeMode="repeat" />
        {activeTab === 'overview' ? (
          <View>
            <View className="px-4 gap-6 pb-3">
              <BillingPlanBanner {...plan} onAction={handlePlanAction} busy={portalBusy} />
              <BillingStorageCard storage={storage} />
            </View>
            <BillingDetailsSection profile={profile} onEdit={handleEditBillingDetails} />
            <BillingPaymentMethodsSection methods={profile.paymentMethods} onAdd={handleAddPaymentMethod} onEdit={handleEditPaymentMethod} />
            {isProOrAbove && (
              <View className="px-4 pb-8 items-center">
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
