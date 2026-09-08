import React from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowUpCircle } from 'lucide-react-native';
import { Button } from '@/components/ui';
import { COLORS, FONTS } from '@/constants/tokens';

type Props = { title: string; subtitle: string; actionLabel: string; onAction: () => void; busy?: boolean };
export const BillingPlanBanner = React.memo(function BillingPlanBanner(props: Props) {
  return <LinearGradient colors={[COLORS.info, COLORS.blue6]} start={{x: 0.2, y: 0}} end={{x: 0.9, y: 1}}
    className="rounded-[30px] overflow-hidden" style={{minHeight: 146}}>
    <View className="flex-row items-center px-5 py-6 gap-3">
      <View className="flex-1">
        <Text className="text-white text-[22px]" style={{fontFamily: FONTS.sansBold}}>{props.title}</Text>
        <Text className="text-white text-[15px] leading-[22px] mt-2" style={{fontFamily: FONTS.sans}}>{props.subtitle}</Text>
      </View>
      <Button onPress={props.onAction} loading={props.busy} size="md" className="h-12 bg-white/20 px-4"
        leftIcon={<ArrowUpCircle size={20} color={COLORS.textInverse}/>} textClassName="text-white text-base">
        {props.actionLabel}
      </Button>
    </View>
  </LinearGradient>;
});
