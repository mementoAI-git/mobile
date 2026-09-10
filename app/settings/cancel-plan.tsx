import React, {useCallback, useState} from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ChevronLeft} from 'lucide-react-native';
import {useRouter} from 'expo-router';
import {useQueryClient} from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {Button, TextInput} from '@/components/ui';
import {TYPE} from '@/constants/typography';
import {COLORS, FONTS} from '@/constants/tokens';
import {cancelBillingSubscription} from '@/features/settings/billing-flow';
import {buildCancellationPayload, CANCELLATION_REASONS, type CancellationReason} from '@/features/settings/subscription-cancellation';

export default function CancelPlanScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<CancellationReason | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const back = useCallback(() => { Haptics.selectionAsync(); if (router.canGoBack()) router.back(); else router.replace('/pricing'); }, [router]);
  const submit = useCallback(async () => {
    const payload = buildCancellationPayload(reason, details);
    if (!payload) { setError(reason === 'other' ? 'Please tell us a little more.' : 'Please choose a reason.'); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); return; }
    setError(''); setBusy(true);
    try { if (await cancelBillingSubscription({queryClient}, payload)) router.replace('/settings/billing'); } finally { setBusy(false); }
  }, [details, queryClient, reason, router]);
  return <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
    <View className="h-[104px] justify-center px-4"><View className="absolute left-4"><Button variant="secondary" size="lg" className="size-14 px-0" onPress={back}><ChevronLeft size={25} color={COLORS.textBase} /></Button></View><Text className="text-center text-text-strong" style={TYPE.screenTitle}>Cancel Plan</Text></View>
    <ScrollView className="flex-1" contentContainerStyle={{paddingHorizontal: 16, paddingBottom: 24}} keyboardShouldPersistTaps="handled">
      <Text className="text-text-strong mt-4" style={TYPE.uiTitle}>Reason for cancellation</Text>
      <Text className="text-text-base mt-3" style={TYPE.bodyLarge}>Your feedback helps us make Memento AI better</Text>
      <View className="bg-fill-weak rounded-[24px] px-4 py-4 mt-7 gap-1">{CANCELLATION_REASONS.map(item => { const selected = reason === item.value; return <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{selected}} onPress={() => {Haptics.selectionAsync(); setReason(item.value); setError('');}} className="min-h-12 flex-row items-center gap-3"><View style={{width: 22, height: 22, borderRadius: 11, borderWidth: selected ? 2 : 1, borderColor: selected ? COLORS.brand : COLORS.strokeWeak, alignItems: 'center', justifyContent: 'center'}}>{selected ? <View style={{width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.brand}} /> : null}</View><Text className="flex-1 text-text-strong" style={TYPE.label}>{item.label}</Text></Pressable>; })}</View>
      {reason === 'other' ? <TextInput label="Tell us more (Something else)" placeholder="Tell us more about this" value={details} onChangeText={setDetails} multiline numberOfLines={4} style={{minHeight: 110, textAlignVertical: 'top'}} containerClassName="mt-6" error={error || undefined} /> : error ? <Text className="text-error-strong mt-3" style={{fontFamily: FONTS.sans}}>{error}</Text> : null}
    </ScrollView>
    <View className="px-4 pt-3 pb-2 border-t border-stroke-weaker bg-background"><Button variant="destructive" size="lg" fullWidth loading={busy} onPress={submit}>Cancel Plan</Button></View>
  </SafeAreaView>;
}
