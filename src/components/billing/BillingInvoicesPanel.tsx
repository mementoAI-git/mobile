import React, {useCallback} from 'react';
import {ActivityIndicator, Pressable, Text, View} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';

import {CARD_PASTEL_SURFACES, COLORS} from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import type {BillingInvoice} from '@/features/settings/billing-adapters';
import {formatInvoiceAmount, formatInvoiceDate} from '@/features/settings/billing-invoice-presentation';

function BillingStatusBadge({status}: {status?: string}) {
  const normalized = status?.toLowerCase();
  const state = normalized === 'paid' || normalized === 'succeeded' ? 'paid' : normalized === 'failed' || normalized === 'void' ? 'failed' : 'pending';
  const label = state === 'paid' ? 'Paid' : state === 'failed' ? 'Failed' : 'Pending';
  const palette = state === 'paid' ? {backgroundColor: CARD_PASTEL_SURFACES[4].bg, color: COLORS.success} : state === 'failed' ? {backgroundColor: COLORS.brandSubtle, color: COLORS.error} : {backgroundColor: CARD_PASTEL_SURFACES[2].bg, color: COLORS.warning};
  return <View style={{borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: palette.backgroundColor}}><Text style={{...TYPE.bodySmall, color: palette.color}}>{label}</Text></View>;
}

const InvoiceRow = React.memo(function InvoiceRow({invoice}: {invoice: BillingInvoice}) {
  const open = useCallback(() => {
    if (!invoice.url) return;
    Haptics.selectionAsync();
    void WebBrowser.openBrowserAsync(invoice.url);
  }, [invoice.url]);
  return <Pressable accessibilityRole={invoice.url ? 'link' : 'text'} accessibilityLabel={`${invoice.label ?? 'Memento Pro'}, ${invoice.status ?? 'pending'}, ${formatInvoiceAmount(invoice)}`} disabled={!invoice.url} onPress={open} style={({pressed}) => ({minHeight: 72, paddingHorizontal: 16, paddingVertical: 12, opacity: pressed ? 0.72 : 1, flexDirection: 'row', alignItems: 'flex-start'})}>
    <View style={{flex: 1}}><View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}><Text style={{...TYPE.bodyLarge, color: COLORS.textStrong}}>{invoice.label ?? 'Memento Pro'}</Text><BillingStatusBadge status={invoice.status}/></View><Text style={{...TYPE.bodySmall, color: COLORS.textWeak, marginTop: 6}}>{formatInvoiceDate(invoice.created_at)}</Text></View>
    <Text style={{...TYPE.bodyLarge, color: COLORS.textStrong, marginTop: 1}}>{formatInvoiceAmount(invoice)}</Text>
  </Pressable>;
});

export const BillingInvoicesPanel = React.memo(function BillingInvoicesPanel({invoices, loading}: {invoices: BillingInvoice[]; loading: boolean}) {
  if (loading) return <ActivityIndicator color={COLORS.brand} style={{marginTop: 80}}/>;
  if (!invoices.length) return <View className="px-8 pt-20 items-center"><Text className="text-text-strong" style={TYPE.cardTitle}>No invoices yet</Text><Text className="text-text-weak mt-2 text-center" style={TYPE.bodySmall}>Your completed payments will appear here.</Text></View>;
  return <View style={{paddingTop: 14}}>{invoices.map((invoice, index) => <InvoiceRow key={invoice.id ?? String(index)} invoice={invoice}/>)}</View>;
});
