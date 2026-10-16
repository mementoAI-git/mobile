import React, {useCallback} from 'react';
import { Text, View } from 'react-native';
import { Pressable } from '@/components/ui/Touchable';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';

import {Skeleton} from '@/components/ui';
import {CARD_PASTEL_SURFACES, COLORS} from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import type {BillingInvoice} from '@/features/settings/billing-adapters';
import {formatInvoiceAmount, formatInvoiceDate} from '@/features/settings/billing-invoice-presentation';

function BillingStatusBadge({status}: {status?: string}) {
  const normalized = status?.toLowerCase();
  const state = normalized === 'paid' || normalized === 'succeeded' ? 'paid' : normalized === 'failed' || normalized === 'void' ? 'failed' : 'pending';
  const label = state === 'paid' ? 'Paid' : state === 'failed' ? 'Failed' : 'Pending';
  const palette = state === 'paid'
    ? {backgroundColor: CARD_PASTEL_SURFACES[3].bg, color: COLORS.success}
    : state === 'failed'
      ? {backgroundColor: COLORS.brandSubtle, color: COLORS.error}
      : {backgroundColor: CARD_PASTEL_SURFACES[2].bg, color: COLORS.warning};
  return (
    <View style={{borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2.5, backgroundColor: palette.backgroundColor}}>
      <Text style={{...TYPE.metadata, color: palette.color}}>{label}</Text>
    </View>
  );
}

const InvoiceRow = React.memo(function InvoiceRow({invoice}: {invoice: BillingInvoice}) {
  const open = useCallback(() => {
    if (!invoice.url) return;
    Haptics.selectionAsync();
    void WebBrowser.openBrowserAsync(invoice.url);
  }, [invoice.url]);

  const rawDate = formatInvoiceDate(invoice.created_at);
  const displayDate = rawDate.includes(',') ? rawDate : rawDate.replace(/([A-Za-z]{3}) (\d{4})/, '$1, $2');

  return (
    <Pressable
      accessibilityRole={invoice.url ? 'link' : 'text'}
      accessibilityLabel={`${invoice.label ?? 'Memento Pro'}, ${invoice.status ?? 'pending'}, ${formatInvoiceAmount(invoice)}`}
      disabled={!invoice.url}
      onPress={open}
      style={({pressed}) => ({
        paddingHorizontal: 20,
        paddingVertical: 14,
        opacity: pressed ? 0.72 : 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
      })}
    >
      <View style={{flex: 1, paddingRight: 16}}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
          <Text style={{...TYPE.bodyStrong, color: COLORS.textStrong}}>
            {invoice.label ?? 'Memento Pro'}
          </Text>
          <BillingStatusBadge status={invoice.status}/>
        </View>
        <Text style={{...TYPE.bodySmall, color: COLORS.textWeak, marginTop: 4}}>
          {displayDate}
        </Text>
      </View>
      <Text style={{...TYPE.bodyStrong, color: COLORS.textStrong, marginTop: 1}}>
        {formatInvoiceAmount(invoice)}
      </Text>
    </Pressable>
  );
});

export const BillingInvoicesPanel = React.memo(function BillingInvoicesPanel({invoices, loading}: {invoices: BillingInvoice[]; loading: boolean}) {
  if (loading) {
    return (
      <View style={{paddingTop: 10, paddingBottom: 24, paddingHorizontal: 20, gap: 16}}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} className="flex-row items-center justify-between py-2">
            <View className="flex-1 gap-2 pr-4">
              <View className="flex-row items-center gap-2.5">
                <Skeleton className="h-5 w-32 rounded-md" />
                <Skeleton className="h-5 w-14 rounded-md" />
              </View>
              <Skeleton className="h-4 w-24 rounded-md" />
            </View>
            <Skeleton className="h-5 w-16 rounded-md" />
          </View>
        ))}
      </View>
    );
  }
  if (!invoices.length) {
    return (
      <View className="px-8 pt-20 items-center">
        <Text className="text-text-strong" style={TYPE.cardTitle}>No invoices yet</Text>
        <Text className="text-text-weak mt-2 text-center" style={TYPE.bodySmall}>Your completed payments will appear here.</Text>
      </View>
    );
  }
  return (
    <View style={{paddingTop: 10, paddingBottom: 24}}>
      {invoices.map((invoice, index) => (
        <InvoiceRow key={invoice.id ?? String(index)} invoice={invoice}/>
      ))}
    </View>
  );
});

