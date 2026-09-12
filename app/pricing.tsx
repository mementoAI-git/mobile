import React, {useCallback} from 'react';
import {ImageBackground, ScrollView, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Check} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {Button} from '@/components/ui';
import {TYPE} from '@/constants/typography';
import {COLORS} from '@/constants/tokens';
import {safeBack} from '@/lib/utils';
import {usePricingLogic} from '@/hooks/use-pricing-logic';
import {useSubscription} from '@/hooks/queries/use-subscription';
import {useUiStore} from '@/store';
import {SettingsSubpageHeader} from '@/components/settings/SettingsSubpageHeader';
import {
  getManagePlanProCardImageStyle,
  getManagePlanProCardStyle,
} from '@/features/settings/manage-plan-layout';

const PRO_PLAN_GRADIENT = require('../assets/images/backgrounds/pro-plan-gradient.webp');

const FREE_FEATURES = ['Add story/journals/thoughts.', 'Core chat and memories', 'Memory insights', 'Standard uploads and storage limit (200MB)'];
const PRO_FEATURES = ['Everything in Free', 'Voice mode conversations.', 'Supermemory integration', 'Bigger storage (10GB)'];

function FeatureList({items, inverse = false}: {items: string[]; inverse?: boolean}) {
  return <View className="gap-4 mt-7">{items.map(item => <View key={item} className="flex-row items-start gap-3"><Check size={21} color={inverse ? COLORS.textInverse : COLORS.textBase} strokeWidth={2} /><Text className="flex-1" style={{...TYPE.body, color: inverse ? COLORS.textInverse : COLORS.textBase}}>{item}</Text></View>)}</View>;
}

export default function ManagePlanScreen() {
  const {interval, changeInterval, handleCheckout, router, loading} = usePricingLogic();
  const {isProOrAbove, summary} = useSubscription();
  const isCancellationScheduled = summary?.cancel_at_period_end === true;
  const back = useCallback(() => { Haptics.selectionAsync(); safeBack(router, '/settings/billing'); }, [router]);
  const requestCancellation = useCallback(() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); useUiStore.getState().openSheet('cancel-subscription-confirmation'); }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} className="flex-1 bg-background" edges={['top']}>
      <SettingsSubpageHeader title="Manage Plan" onBack={back} />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        alwaysBounceVertical={true}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 56 }}
      >
          <View className="flex-row self-center bg-fill-weak rounded-full p-1 w-[280px] mt-4 mb-6">{(['monthly', 'annual'] as const).map(value => <TouchableOpacity key={value} accessibilityRole="button" onPress={() => changeInterval(value)} className={`h-11 flex-1 items-center justify-center rounded-full ${interval === value ? 'bg-text-strong' : ''}`}><Text className={interval === value ? 'text-white' : 'text-text-strong'} style={TYPE.buttonSmall}>{value === 'monthly' ? 'Monthly' : 'Annual'}</Text></TouchableOpacity>)}</View>
          <View className="rounded-[32px] bg-fill-weak px-6 py-7">
            <Text className="text-text-strong" style={TYPE.uiTitle}>Free</Text><Text className="text-text-base mt-2" style={TYPE.body}>Capture and reflect at your own pace</Text><FeatureList items={FREE_FEATURES} />
            <View className="flex-row items-end mt-8"><Text className="text-brand" style={TYPE.displayTitle}>$0</Text><Text className="text-text-weak mb-2 ml-2" style={TYPE.body}>/ month</Text></View>
            <Button variant="secondary" size="lg" fullWidth className="mt-7 bg-white" disabled={!isProOrAbove} onPress={requestCancellation}>{isProOrAbove ? 'Downgrade to Free' : 'Current plan'}</Button>
          </View>
          <ImageBackground
            source={PRO_PLAN_GRADIENT}
            resizeMode="cover"
            imageStyle={getManagePlanProCardImageStyle()}
            style={getManagePlanProCardStyle()}
          >
            <Text className="text-white" style={TYPE.uiTitle}>Pro</Text><Text className="text-white mt-2" style={TYPE.body}>For users who want to benefit more</Text><FeatureList items={PRO_FEATURES} inverse />
            <View className="flex-row items-end mt-8"><Text className="text-white" style={TYPE.displayTitle}>{interval === 'monthly' ? '$9.99' : '$79'}</Text><Text className="text-white mb-2 ml-2" style={TYPE.body}>/ {interval === 'monthly' ? 'month' : 'year'}</Text></View>
            <Button variant="secondary" size="lg" fullWidth className="mt-7 bg-white" loading={loading} disabled={isProOrAbove || isCancellationScheduled} onPress={() => handleCheckout('pro')}>{isProOrAbove ? 'Current plan' : 'Start 14-day trial'}</Button>
          </ImageBackground>
          {isProOrAbove && !isCancellationScheduled ? <View className="mt-8"><View className="flex-row justify-between items-center"><Text className="text-text-strong" style={TYPE.uiTitle}>Cancel plan</Text><Button variant="secondary" size="md" textClassName="text-error" onPress={requestCancellation}>Cancel</Button></View><Text className="text-text-base mt-3" style={TYPE.body}>If you cancel, you’ll keep full access to your plan features until the end of your billing period</Text></View> : null}
        </ScrollView>
    </SafeAreaView>
  );
}
