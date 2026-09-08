import React, {useCallback, useState} from 'react';
import {KeyboardAvoidingView, Platform, Text, TouchableOpacity, View} from 'react-native';
import {BottomSheetScrollView, BottomSheetTextInput} from '@gorhom/bottom-sheet';
import {X} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Button} from '@/components/ui';
import {COLORS, FONTS} from '@/constants/tokens';
import type {BillingProfile} from '@/features/settings/billing-adapters';

export interface BillingDetailsForm {
  email: string;
  name: string;
  relationship: string;
  about: string;
  originalAbout: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

function Field({label, value, onChangeText, multiline}: {label: string; value: string; onChangeText: (value: string) => void; multiline?: boolean}) {
  return <View style={{gap: 8}}><Text style={{fontFamily: FONTS.sansMedium, fontSize: 14, color: COLORS.textStrong}}>{label}</Text><BottomSheetTextInput value={value} onChangeText={onChangeText} multiline={multiline} keyboardType={label.includes('email') ? 'email-address' : 'default'} autoCapitalize={label.includes('email') ? 'none' : 'words'} style={{minHeight: multiline ? 84 : 48, borderWidth: 1, borderColor: COLORS.strokeWeak, borderRadius: 10, backgroundColor: COLORS.card, paddingHorizontal: 12, paddingVertical: multiline ? 12 : 0, fontFamily: FONTS.sans, fontSize: 17, color: COLORS.textStrong, textAlignVertical: multiline ? 'top' : 'center'}}/></View>;
}

export function EditBillingDetailsSheet({profile, onSave, onClose}: {profile: BillingProfile; onSave: (values: BillingDetailsForm) => Promise<void>; onClose: () => void}) {
  const insets = useSafeAreaInsets();
  const address = profile.address;
  const originalAbout = [address?.line1, address?.line2, address?.city, address?.state, address?.postalCode].filter(Boolean).join(', ');
  const [values, setValues] = useState<BillingDetailsForm>({
    email: profile.email ?? '',
    name: profile.name ?? '',
    relationship: '',
    about: originalAbout,
    originalAbout,
    line1: address?.line1 ?? '',
    line2: address?.line2 ?? '',
    city: address?.city ?? '',
    state: address?.state ?? '',
    postalCode: address?.postalCode ?? '',
    country: address?.country ?? '',
  });
  const [saving, setSaving] = useState(false);
  const set = useCallback((key: keyof BillingDetailsForm, value: string) => setValues(current => ({...current, [key]: value})), []);
  const submit = useCallback(async () => {setSaving(true); try {Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); await onSave(values); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onClose();} finally {setSaving(false);}}, [onClose, onSave, values]);
  return <View style={{flex: 1}}><KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={{minHeight: 68, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}><Text style={{fontFamily: FONTS.sansBold, fontSize: 20, color: COLORS.textStrong}}>Edit Billing Details</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Close billing details" onPress={onClose} style={{width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.fillWeak}}><X size={22} color={COLORS.textStrong}/></TouchableOpacity></View>
    <BottomSheetScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24, gap: 18}}><Field label="Billing email address" value={values.email} onChangeText={value => set('email', value)}/><Field label="Name" value={values.name} onChangeText={value => set('name', value)}/><Field label="Relationship" value={values.relationship} onChangeText={value => set('relationship', value)}/><Field label="About" value={values.about} onChangeText={value => set('about', value)} multiline/><Field label="Country" value={values.country} onChangeText={value => set('country', value)}/></BottomSheetScrollView>
    <View style={{flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12) + 8, borderTopWidth: 1, borderTopColor: COLORS.strokeWeaker, backgroundColor: COLORS.background}}><Button variant="secondary" size="lg" className="h-14 flex-1" onPress={onClose}>Dismiss</Button><Button size="lg" className="h-14 flex-1 bg-fill-strong" loading={saving} onPress={() => void submit()}>Save Changes</Button></View>
  </KeyboardAvoidingView></View>;
}
