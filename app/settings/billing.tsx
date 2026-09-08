import React, { useCallback } from 'react';
import { ImageBackground, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Button, ConfirmDialog } from '@/components/ui';
import { SETTINGS_TYPE } from '@/components/settings/settings-typography';
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
    cancelBusy, resumeBusy, cancelConfirmVisible, setCancelConfirmVisible,
    handleRefresh, handlePortal, handleCancel, confirmCancel, handleResume,
    isCancelled, activeTab, setActiveTab, profile, handleUpgrade,
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
      <View className="h-[104px] px-4 justify-center">
        <View className="absolute left-4 z-10">
          <Button variant="secondary" size="lg" className="size-14 px-0" onPress={handleBack}>
            <ChevronLeft size={25} color={COLORS.textBase} />
          </Button>
        </View>
        <Text className="text-center" style={SETTINGS_TYPE.screenTitle}>Billing</Text>
      </View>

      <BillingTabs active={activeTab} onChange={setActiveTab} />
      <ScrollView
        className="flex-1 mt-5"
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
            <BillingDetailsSection profile={profile} onEdit={handlePortal} />
            <BillingPaymentMethodsSection methods={profile.paymentMethods} onAdd={handlePortal} onEdit={handlePortal} />
            {isProOrAbove && (
              <View className="px-4 pb-8 items-center">
                {!isCancelled ? <Button variant="ghost" size="lg" loading={cancelBusy} onPress={handleCancel} textClassName="text-error-strong">Cancel subscription</Button> : null}
                {(summary?.cancel_at_period_end || summary?.status === 'paused') && (
                  <Button variant="outline" size="lg" loading={resumeBusy} onPress={handleResume}>Resume subscription</Button>
                )}
              </View>
            )}
          </View>
        ) : <BillingInvoicesPanel invoices={invoices} loading={invoicesLoading} />}
      </ScrollView>

      <ConfirmDialog
        visible={cancelConfirmVisible}
        title="Cancel subscription?"
        message="You'll keep access until the end of your current billing cycle. This can be reversed before then."
        onClose={() => setCancelConfirmVisible(false)}
        buttons={[
          {label: 'Cancel plan', variant: 'destructive', onPress: confirmCancel},
          {label: 'Keep my plan', variant: 'ghost', onPress: () => setCancelConfirmVisible(false)},
        ]}
      />
    </SafeAreaView>
  );
}
