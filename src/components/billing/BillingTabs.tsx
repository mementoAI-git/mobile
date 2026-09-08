import React from 'react';
import { View } from 'react-native';
import { Button } from '@/components/ui';

type Props = { active: 'overview' | 'invoices'; onChange: (tab: 'overview' | 'invoices') => void };

export const BillingTabs = React.memo(function BillingTabs({active, onChange}: Props) {
  return <View className="flex-row gap-3 px-4">
    <Button size="lg" variant={active === 'overview' ? 'primary' : 'secondary'}
      className={active === 'overview' ? 'bg-fill-strong h-12 px-5' : 'h-12 px-5'}
      onPress={() => onChange('overview')}>Overview</Button>
    <Button size="lg" variant={active === 'invoices' ? 'primary' : 'secondary'}
      className={active === 'invoices' ? 'bg-fill-strong h-12 px-5' : 'h-12 px-5'}
      onPress={() => onChange('invoices')}>{active === 'invoices' ? 'Invoices' : 'Recent invoices'}</Button>
  </View>;
});
