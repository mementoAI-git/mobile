import React from 'react';
import { Text, View } from 'react-native';
import { FileText, Pencil } from 'lucide-react-native';
import { Button } from '@/components/ui';
import { TYPE } from '@/constants/typography';
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
    <Text className="mt-5 text-text-weak" style={TYPE.body}>Billing email</Text>
    <Text className="mt-2 text-text-strong" style={TYPE.cardTitle}>{profile.email ?? '—'}</Text>
    <Text className="mt-6 text-text-weak" style={TYPE.body}>Name</Text>
    <Text className="mt-2 text-text-strong" style={TYPE.cardTitle}>{profile.name ?? '—'}</Text>
    <Text className="mt-6 text-text-weak" style={TYPE.body}>Address</Text>
    <Text className="mt-2 text-text-strong" style={TYPE.cardTitle}>{addressLines.length ? addressLines.join('\n') : '—'}</Text>
  </View>;
});
