import React, {useCallback} from 'react';
import {ScrollView, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {LinearGradient} from 'expo-linear-gradient';
import {Check, ChevronLeft} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {Button} from '@/components/ui';
import {TYPE} from '@/constants/typography';
import {COLORS, FONTS} from '@/constants/tokens';
import {usePricingLogic} from '@/hooks/use-pricing-logic';
import {useSubscription} from '@/hooks/queries/use-subscription';
import {useUiStore} from '@/store';

const FREE_FEATURES = ['Add story/journals/thoughts.', 'Core chat and memories', 'Memory insights', 'Standard uploads and storage limit (200MB)'];
const PRO_FEATURES = ['Everything in Free', 'Voice mode conversations.', 'Supermemory integration', 'Bigger storage (10GB)'];

function FeatureList({items, inverse = false}: {items: string[]; inverse?: boolean}) {
  return <View className="gap-4 mt-7">{items.map(item => <View key={item} className="flex-row items-start gap-3"><Check size={21} color={inverse ? COLORS.textInverse : COLORS.textBase} strokeWidth={2} /><Text className="flex-1" style={{...TYPE.bodyLarge, color: inverse ? COLORS.textInverse : COLORS.textStrong}}>{item}</Text></View>)}</View>;
}

export default function ManagePlanScreen() {
  const {interval, changeInterval, handleCheckout, router, loading} = usePricingLogic();
  const {isProOrAbove, summary} = useSubscription();
  const isCancellationScheduled = summary?.cancel_at_period_end === true;
  const back = useCallback(() => { Haptics.selectionAsync(); if (router.canGoBack()) router.back(); else router.replace('/settings/billing'); }, [router]);
  const requestCancellation = useCallback(() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); useUiStore.getState().openSheet('cancel-subscription-confirmation'); }, []);

  return <SafeAreaView className="flex-1 bg-background" edges={['top']}>
    <View className="h-[104px] justify-center px-4"><View className="absolute left-4"><Button variant="secondary" size="lg" className="size-14 px-0" onPress={back}><ChevronLeft size={25} color={COLORS.textBase} /></Button></View><Text className="text-center text-text-strong" style={TYPE.screenTitle}>Manage Plan</Text></View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 16, paddingBottom: 40}}>
      <View className="flex-row self-center bg-fill-weak rounded-xl p-1 w-[280px] mt-4 mb-6">{(['monthly', 'annual'] as const).map(value => <TouchableOpacity key={value} accessibilityRole="button" onPress={() => changeInterval(value)} className={`h-12 flex-1 items-center justify-center rounded-xl ${interval === value ? 'bg-text-strong' : ''}`}><Text className={interval === value ? 'text-white' : 'text-text-strong'} style={TYPE.button}>{value === 'monthly' ? 'Monthly' : 'Annual'}</Text></TouchableOpacity>)}</View>
      <View className="rounded-[32px] bg-fill-weak px-6 py-7">
        <Text className="text-text-strong" style={TYPE.uiTitle}>Free</Text><Text className="text-text-strong mt-2" style={TYPE.bodyLarge}>Capture and reflect at your own pace</Text><FeatureList items={FREE_FEATURES} />
        <View className="flex-row items-end mt-8"><Text className="text-brand" style={TYPE.displayTitle}>$0</Text><Text className="text-text-strong mb-2 ml-2" style={TYPE.bodyLarge}>/ month</Text></View>
        <Button variant="outline" size="lg" fullWidth className="mt-7 bg-transparent" disabled={!isProOrAbove} onPress={requestCancellation}>{isProOrAbove ? 'Downgrade to Free' : 'Current plan'}</Button>
      </View>
      <LinearGradient colors={[COLORS.brand, COLORS.brand, COLORS.onboardingAmberLight]} locations={[0, 0.58, 1]} className="rounded-[32px] px-6 py-7 mt-6" style={{overflow: 'hidden'}}>
        <Text className="text-white" style={TYPE.uiTitle}>Pro</Text><Text className="text-white mt-2" style={TYPE.bodyLarge}>For users who want to benefit more</Text><FeatureList items={PRO_FEATURES} inverse />
        <View className="flex-row items-end mt-8"><Text className="text-white" style={TYPE.displayTitle}>{interval === 'monthly' ? '$9.99' : '$79'}</Text><Text className="text-white mb-2 ml-2" style={TYPE.bodyLarge}>/ {interval === 'monthly' ? 'month' : 'year'}</Text></View>
        <Button variant="secondary" size="lg" fullWidth className="mt-7 bg-white" loading={loading} disabled={isProOrAbove || isCancellationScheduled} onPress={() => handleCheckout('pro')}>{isProOrAbove ? 'Current plan' : 'Start 14-day trial'}</Button>
      </LinearGradient>
      {isProOrAbove && !isCancellationScheduled ? <View className="mt-8"><View className="flex-row justify-between items-center"><Text className="text-text-strong" style={TYPE.uiTitle}>Cancel plan</Text><Button variant="outline" size="md" textClassName="text-error-strong" onPress={requestCancellation}>Cancel</Button></View><Text className="text-text-base mt-3" style={TYPE.body}>If you cancel, you’ll keep full access to your plan features until the end of your billing period</Text></View> : null}
    </ScrollView>
  </SafeAreaView>;
}
