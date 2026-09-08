import React from 'react';
import { Text, View } from 'react-native';
import { FileText, Pencil } from 'lucide-react-native';
import { Button } from '@/components/ui';
import { COLORS, FONTS } from '@/constants/tokens';
import type { BillingProfile } from '@/features/settings/billing-adapters';

export const BillingDetailsSection = React.memo(function BillingDetailsSection({profile, onEdit}: {profile: BillingProfile; onEdit: () => void}) {
  const address = profile.address;
  const addressLines = address ? [address.line1, address.line2, [address.city, address.state, address.postalCode].filter(Boolean).join(', '), address.country].filter(Boolean) : [];
  return <View className="px-4 py-6 border-t border-stroke-weak">
    <View className="flex-row items-center">
      <FileText size={23} color={COLORS.textBase}/><Text className="ml-3 flex-1 text-xl text-text-strong" style={{fontFamily: FONTS.sansMedium}}>Billing details</Text>
      <Button variant="outline" size="md" className="h-12 px-4" leftIcon={<Pencil size={19} color={COLORS.textStrong}/>} onPress={onEdit}>Edit</Button>
    </View>
    <Text className="mt-5 text-[15px] text-text-weak" style={{fontFamily: FONTS.sans}}>Billing email</Text>
    <Text className="mt-2 text-[17px] text-text-strong" style={{fontFamily: FONTS.sansMedium}}>{profile.email ?? '—'}</Text>
    <Text className="mt-6 text-[15px] text-text-weak" style={{fontFamily: FONTS.sans}}>Name</Text>
    <Text className="mt-2 text-[17px] text-text-strong" style={{fontFamily: FONTS.sansMedium}}>{profile.name ?? '—'}</Text>
    <Text className="mt-6 text-[15px] text-text-weak" style={{fontFamily: FONTS.sans}}>Address</Text>
    <Text className="mt-2 text-[17px] leading-7 text-text-strong" style={{fontFamily: FONTS.sansMedium}}>{addressLines.length ? addressLines.join('\n') : '—'}</Text>
  </View>;
});
