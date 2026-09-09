import React, {useCallback, useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {BottomSheetScrollView, BottomSheetView} from '@gorhom/bottom-sheet';
import {CreditCard, X} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Button} from '@/components/ui';
import {COLORS, FONTS} from '@/constants/tokens';
import {openBillingPortal} from '@/features/settings/billing-flow';

function SecureField({label, value}: {label: string; value: string}) {return <View style={{gap: 8, flex: 1}}><Text style={{fontFamily: FONTS.sansMedium, fontSize: 14, color: COLORS.textStrong}}>{label}</Text><View style={{height: 40, borderWidth: 1, borderColor: COLORS.strokeWeak, borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center', backgroundColor: COLORS.card}}><Text style={{fontFamily: FONTS.sans, fontSize: 16, color: COLORS.textWeak}}>{value}</Text></View></View>}

function PaymentCardPlaceholder() {
  return <View style={{width: 132, height: 100, borderRadius: 12, overflow: 'hidden', backgroundColor: COLORS.strokeWeaker}}>
    <View style={{height: 24, marginTop: 24, backgroundColor: COLORS.strokeWeak}}/>
    <View style={{position: 'absolute', right: 12, bottom: 12, width: 38, height: 14, borderRadius: 7, backgroundColor: COLORS.strokeWeak}}/>
  </View>;
}

export function AddPaymentMethodSheet({onClose, canManage = true, onUpgrade}: {onClose: () => void; canManage?: boolean; onUpgrade?: () => void}) {
  const insets = useSafeAreaInsets(); const [busy, setBusy] = useState(false);
  const continueSecurely = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!canManage) {
      onClose();
      onUpgrade?.();
      return;
    }
    setBusy(true);
    try {
      const opened = await openBillingPortal({returnPath: '/settings/billing'});
      if (opened) onClose();
    } finally {
      setBusy(false);
    }
  }, [canManage, onClose, onUpgrade]);
  return <BottomSheetView style={{flex: 1}}><View style={{minHeight: 86, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}><Text style={{fontFamily: FONTS.sansBold, fontSize: 20, color: COLORS.textStrong}}>Add Payment Method</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Close payment method" onPress={onClose} style={{width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.fillWeak}}><X size={20} color={COLORS.textStrong}/></TouchableOpacity></View>
    <BottomSheetScrollView style={{flex: 1}} contentContainerStyle={{paddingHorizontal: 20, paddingTop: 0, paddingBottom: 20, gap: 18}}><View style={{height: 152, borderRadius: 16, backgroundColor: COLORS.fillWeak, alignItems: 'center', justifyContent: 'center'}}><PaymentCardPlaceholder/></View><View style={{gap: 8}}><Text style={{fontFamily: FONTS.sansMedium, fontSize: 14, color: COLORS.textStrong}}>Payment Method</Text><View style={{flexDirection: 'row', gap: 8}}><View style={{flex: 1, minHeight: 44, borderWidth: 1, borderColor: COLORS.brand, borderRadius: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12, backgroundColor: COLORS.brandSubtle}}><CreditCard size={20} color={COLORS.textStrong}/><Text style={{fontFamily: FONTS.sans, fontSize: 17, color: COLORS.textStrong}}>Card</Text></View><View style={{flex: 1, minHeight: 44, borderWidth: 1, borderColor: COLORS.strokeWeak, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8}}><Text style={{fontFamily: FONTS.sansBold, fontSize: 19, color: COLORS.blue7}}>P</Text><Text style={{fontFamily: FONTS.sans, fontSize: 17, color: COLORS.textStrong}}>PayPal</Text></View></View></View><SecureField label="Card number" value="Enter securely with Polar"/><View style={{flexDirection: 'row', gap: 12}}><SecureField label="Expiration date" value="MM / YY"/><SecureField label="Security code" value="CVV"/></View><SecureField label="Full name" value="Added in secure checkout"/><View style={{flexDirection: 'row', gap: 12}}><SecureField label="Country or region" value="Select in Polar"/><SecureField label="ZIP code" value="Enter in Polar"/></View><Text style={{fontFamily: FONTS.sans, fontSize: 12, lineHeight: 18, color: COLORS.textWeak}}>Your payment details are entered directly in Polar’s secure checkout and never pass through Memento.</Text></BottomSheetScrollView>
    <View style={{flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12) + 8, borderTopWidth: 1, borderTopColor: COLORS.strokeWeaker, backgroundColor: COLORS.background}}><Button variant="secondary" size="lg" className="h-[52px] flex-1" onPress={onClose}>Dismiss</Button><Button size="lg" className="h-[52px] flex-1 bg-fill-strong" loading={busy} onPress={() => void continueSecurely()}>Continue securely</Button></View></BottomSheetView>;
}
