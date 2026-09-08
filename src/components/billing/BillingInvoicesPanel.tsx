import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Button } from '@/components/ui';
import { COLORS, FONTS } from '@/constants/tokens';
import type { BillingInvoice } from '@/features/settings/billing-adapters';

export const BillingInvoicesPanel = React.memo(function BillingInvoicesPanel({invoices, loading}: {invoices: BillingInvoice[]; loading: boolean}) {
  if (loading) return <ActivityIndicator color={COLORS.brand} className="mt-20"/>;
  if (!invoices.length) return <View className="px-8 pt-20 items-center"><Text className="text-xl text-text-strong" style={{fontFamily: FONTS.serif}}>No invoices yet</Text><Text className="text-sm text-text-weak mt-2 text-center" style={{fontFamily: FONTS.sans}}>Your completed payments will appear here.</Text></View>;
  return <View className="px-4 pt-6 gap-3">{invoices.map((invoice, index) => <Button key={invoice.id ?? String(index)} variant="outline" size="lg" fullWidth onPress={() => invoice.url && WebBrowser.openBrowserAsync(invoice.url)}>{invoice.label ?? `Invoice ${index + 1}`}</Button>)}</View>;
});
