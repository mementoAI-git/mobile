import React from 'react';
import { View } from 'react-native';
import { Button } from '@/components/ui';

type Props = { active: 'overview' | 'invoices'; onChange: (tab: 'overview' | 'invoices') => void };

export const BillingTabs = React.memo(function BillingTabs({active, onChange}: Props) {
  return <View className="flex-row gap-3 px-4">
    <Button key={`overview-${active === 'overview' ? 'active' : 'inactive'}`} size="md" variant={active === 'overview' ? 'primary' : 'secondary'}
      className={active === 'overview' ? 'bg-fill-strong h-8 px-3 rounded-lg' : 'h-8 px-3 rounded-lg'} textClassName="text-base"
      onPress={() => onChange('overview')}>Overview</Button>
    <Button key={`invoices-${active === 'invoices' ? 'active' : 'inactive'}`} size="md" variant={active === 'invoices' ? 'primary' : 'secondary'}
      className={active === 'invoices' ? 'bg-fill-strong h-8 px-3 rounded-lg' : 'h-8 px-3 rounded-lg'} textClassName="text-base"
      onPress={() => onChange('invoices')}>{active === 'invoices' ? 'Invoices' : 'Recent invoices'}</Button>
  </View>;
});
