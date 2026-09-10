import React from 'react';
import { Text, View } from 'react-native';
import { Pencil } from 'lucide-react-native';
import { Button } from '@/components/ui';
import { TYPE } from '@/constants/typography';
import { COLORS } from '@/constants/tokens';
import type { BillingProfile } from '@/features/settings/billing-adapters';

export const BillingDetailsSection = React.memo(function BillingDetailsSection({profile, onEdit}: {profile: BillingProfile; onEdit: () => void}) {
  const address = profile.address;
  const addressLines = address ? [address.line1, address.line2, [address.city, address.state, address.postalCode].filter(Boolean).join(', '), address.country].filter(Boolean) : [];
  return <View className="px-4 py-6 border-t border-stroke-weak">
    <View className="min-h-14 flex-row items-center">
      <Text className="flex-1 text-text-strong" style={TYPE.sectionTitle}>Billing details</Text>
      <Button variant="secondary" size="lg" className="h-10 px-4" leftIcon={<Pencil size={18} color={COLORS.textStrong}/>} onPress={onEdit}>Edit</Button>
    </View>
    <Text className="mt-4 text-text-weak" style={TYPE.bodySmall}>Billing email</Text>
    <Text className="mt-2 text-text-strong" style={TYPE.body}>{profile.email ?? '—'}</Text>
    <Text className="mt-5 text-text-weak" style={TYPE.bodySmall}>Name</Text>
    <Text className="mt-2 text-text-strong" style={TYPE.body}>{profile.name ?? '—'}</Text>
    <Text className="mt-5 text-text-weak" style={TYPE.bodySmall}>Address</Text>
    <Text className="mt-2 text-text-strong" style={TYPE.body}>{addressLines.length ? addressLines.join('\n') : '—'}</Text>
  </View>;
});
