import React from 'react';
import { View } from 'react-native';
import { Button } from '@/components/ui';

type Props = { active: 'overview' | 'invoices'; onChange: (tab: 'overview' | 'invoices') => void };

export const BillingTabs = React.memo(function BillingTabs({active, onChange}: Props) {
  return <View className="mt-7 flex-row gap-3 px-4">
    <Button size="md" variant="secondary"
      className={active === 'overview' ? 'bg-text-strong' : undefined}
      textClassName={active === 'overview' ? 'text-white' : undefined}
      onPress={() => onChange('overview')}>Overview</Button>
    <Button size="md" variant="secondary"
      className={active === 'invoices' ? 'bg-text-strong' : undefined}
      textClassName={active === 'invoices' ? 'text-white' : undefined}
      onPress={() => onChange('invoices')}>{active === 'invoices' ? 'Invoices' : 'Recent invoices'}</Button>
  </View>;
});
