import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { TYPE } from '@/constants/typography';

type Props = { active: 'overview' | 'invoices'; onChange: (tab: 'overview' | 'invoices') => void };

export const BillingTabs = React.memo(function BillingTabs({active, onChange}: Props) {
  return (
    <View className="mt-4 flex-row gap-3 px-5">
      <TouchableOpacity
        onPress={() => {
          Haptics.selectionAsync();
          onChange('overview');
        }}
        activeOpacity={0.78}
        className={`h-11 flex-row items-center rounded-full px-5 ${active === 'overview' ? 'bg-text-strong' : 'bg-fill-weak'}`}
      >
        <Text
          className={active === 'overview' ? 'text-white' : 'text-text-strong'}
          style={TYPE.buttonSmall}
        >
          Overview
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => {
          Haptics.selectionAsync();
          onChange('invoices');
        }}
        activeOpacity={0.78}
        className={`h-11 flex-row items-center rounded-full px-5 ${active === 'invoices' ? 'bg-text-strong' : 'bg-fill-weak'}`}
      >
        <Text
          className={active === 'invoices' ? 'text-white' : 'text-text-strong'}
          style={TYPE.buttonSmall}
        >
          Invoices
        </Text>
      </TouchableOpacity>
    </View>
  );
});
