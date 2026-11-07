import { useThemeColors } from '@/hooks/use-theme-colors';
import React from 'react';
import { Text, View } from 'react-native';
import { TYPE } from '@/constants/typography';
import { COLORS } from '@/constants/tokens';
import { radius, responsiveSpace } from '@/constants/responsive';
import type { StoragePresentation } from '@/features/settings/billing-storage';

function formatBytes(bytes: number) {
  if (bytes <= 0) return '0B';
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${Number(gb.toFixed(1))}GB`;
  return `${Number((bytes / 1024 ** 2).toFixed(0))}MB`;
}

export const BillingStorageCard = React.memo(function BillingStorageCard({storage}: {storage: StoragePresentation}) {
  const COLORS = useThemeColors();
  return (
    <View className="rounded-[24px]" style={{ borderRadius: radius(24), padding: responsiveSpace(20), backgroundColor: COLORS.fillWeak }}>
      <View className="flex-row justify-between items-center">
        <Text style={{ ...TYPE.bodyStrong, color: COLORS.textStrong }}>Storage</Text>
        <Text style={{ ...TYPE.label, color: COLORS.textWeak }}>
          {formatBytes(storage.used)} / {formatBytes(storage.limit)} Used
        </Text>
      </View>
      <View style={{ height: 12, borderRadius: 999, backgroundColor: COLORS.card, marginTop: 14, overflow: 'hidden', justifyContent: 'center' }}>
        <View
          style={{
            width: `${Math.min(storage.percent, 100)}%`,
            height: '100%',
            borderRadius: 999,
            backgroundColor: COLORS.brand,
          }}
        />
      </View>
      <View style={{ marginTop: 10 }}>
        <Text style={{ ...TYPE.bodySmall, color: COLORS.textWeak }}>
          {formatBytes(storage.remaining)} Available
        </Text>
      </View>
    </View>
  );
});
