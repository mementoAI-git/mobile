import React from 'react';
import { Text, View } from 'react-native';
import { COLORS, FONTS } from '@/constants/tokens';
import type { StoragePresentation } from '@/features/settings/billing-storage';

function formatBytes(bytes: number) {
  if (bytes <= 0) return '0B';
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${Number(gb.toFixed(1))}GB`;
  return `${Number((bytes / 1024 ** 2).toFixed(0))}MB`;
}

export const BillingStorageCard = React.memo(function BillingStorageCard({storage}: {storage: StoragePresentation}) {
  return <View className="rounded-[28px] bg-fill-weak px-5 py-4">
    <View className="flex-row justify-between items-center">
      <Text className="text-[17px] text-text-strong" style={{fontFamily: FONTS.sansMedium}}>Storage</Text>
      <Text className="text-[16px] text-text-base" style={{fontFamily: FONTS.sans}}>{formatBytes(storage.used)} / {formatBytes(storage.limit)} Used</Text>
    </View>
    <View className="h-[13px] rounded bg-card mt-2 overflow-hidden">
      <View style={{width: `${storage.percent}%`, height: 13, backgroundColor: COLORS.onboardingAmber}} />
    </View>
    <Text className="text-[16px] text-text-base mt-2" style={{fontFamily: FONTS.sans}}>{formatBytes(storage.remaining)} Available</Text>
  </View>;
});
