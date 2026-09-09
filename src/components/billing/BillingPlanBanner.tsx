import React from 'react';
import {Text, View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {ArrowUpCircle} from 'lucide-react-native';
import {Button} from '@/components/ui';
import {COLORS, FONTS} from '@/constants/tokens';

type Props = {title: string; subtitle: string; actionLabel: string; action: 'upgrade' | 'portal'; variant: 'free' | 'paid'; statusLabel: string | null; onAction: () => void; busy?: boolean};

export const BillingPlanBanner = React.memo(function BillingPlanBanner(props: Props) {
  const paid = props.variant === 'paid';
  return <LinearGradient colors={paid ? [COLORS.brand, COLORS.onboardingAmberLight] : [COLORS.info, COLORS.blue6]} start={{x: 0.15, y: 0}} end={{x: 0.9, y: 1}} style={{height: paid ? 142 : 96, borderRadius: 16, overflow: 'hidden'}}>
    {paid ? <View style={{flex: 1, paddingHorizontal: 12, paddingVertical: 14}}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}><Text style={{flex: 1, color: COLORS.textInverse, fontFamily: FONTS.sansBold, fontSize: 16, lineHeight: 22}}>{props.title}</Text><View style={{height: 24, borderRadius: 12, backgroundColor: COLORS.card, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 6}}><View style={{width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.textStrong}}/><Text style={{fontFamily: FONTS.sansMedium, fontSize: 12, color: COLORS.textStrong}}>{props.statusLabel}</Text></View></View>
      <Text style={{maxWidth: 315, color: COLORS.textInverse, fontFamily: FONTS.sans, fontSize: 14, lineHeight: 20, marginTop: 8}}>{props.subtitle}</Text>
      <Button onPress={props.onAction} loading={props.busy} size="sm" className="h-8 self-start bg-white/20 px-3 mt-auto" textClassName="text-white text-sm">{props.actionLabel}</Button>
    </View> : <View style={{flex: 1, justifyContent: 'center', paddingHorizontal: 16}}>
      <View><Text style={{maxWidth: 235, color: COLORS.textInverse, fontFamily: FONTS.sansBold, fontSize: 17, lineHeight: 22}}>{props.title}</Text><Text style={{maxWidth: 280, color: COLORS.textInverse, fontFamily: FONTS.sans, fontSize: 13, lineHeight: 18, marginTop: 5}}>{props.subtitle}</Text></View>
      <Button onPress={props.onAction} loading={props.busy} size="sm" className="absolute right-4 h-8 bg-white/20 px-3" leftIcon={<ArrowUpCircle size={16} color={COLORS.textInverse}/>} textClassName="text-white text-sm">{props.actionLabel}</Button>
    </View>}
  </LinearGradient>;
});
