import React from 'react';
import { Text, View } from 'react-native';
import { CreditCard, Pencil } from 'lucide-react-native';
import { Button } from '@/components/ui';
import { TYPE } from '@/constants/typography';
import { COLORS, FONTS } from '@/constants/tokens';
import type { BillingPaymentMethod } from '@/features/settings/billing-adapters';

function MastercardMark() { return <View className="w-8 h-5 relative"><View className="absolute left-0 size-5 rounded-full bg-error-strong"/><View className="absolute right-0 size-5 rounded-full bg-brand"/></View>; }
export const BillingPaymentMethodsSection = React.memo(function BillingPaymentMethodsSection({methods, onAdd, onEdit}: {methods: BillingPaymentMethod[]; onAdd: () => void; onEdit: (id: string) => void}) {
  return <View className="px-4 py-6 border-t border-stroke-weak">
    <View className="flex-row items-center">
      <CreditCard size={24} color={COLORS.textBase}/><Text className="ml-3 flex-1 text-xl text-text-strong" style={{fontFamily: FONTS.sansMedium}}>Payment methods</Text>
      <Button variant="outline" size="md" className="h-12 px-4" onPress={onAdd}>Add new</Button>
    </View>
    <View className="mt-3 gap-3">{methods.map(method => <View key={method.id} className="flex-row items-center min-h-[58px]">
      <MastercardMark/><View className="ml-3 flex-1"><Text className="capitalize text-text-strong" style={TYPE.cardTitle}>{method.brand}</Text><Text className="text-text-weak mt-1" style={TYPE.body}>**** {method.last4}</Text></View>
      {method.isDefault && <View className="bg-success-strong rounded-full px-3 py-2 mr-2"><Text className="text-white text-sm" style={{fontFamily: FONTS.sansMedium}}>Default</Text></View>}
      <Button variant="ghost" size="md" className="size-11 px-0" onPress={() => onEdit(method.id)}><Pencil size={22} color={COLORS.textBase}/></Button>
    </View>)}</View>
  </View>;
});
