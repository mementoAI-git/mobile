import { useThemeColors } from '@/hooks/use-theme-colors';
import React, {useCallback, useState} from 'react';
import { Text, View } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import {BottomSheetScrollView, BottomSheetTextInput} from '@gorhom/bottom-sheet';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import * as Haptics from 'expo-haptics';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Button} from '@/components/ui';

import {COLORS} from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import type {BillingProfile} from '@/features/settings/billing-adapters';
import { SHEET_GROUP_GAP, SHEET_SECTION_GAP, getSheetActionsBottomPadding } from '@/features/layout/sheet-safe-area';
import {SheetHeader} from './SheetHeader';

export interface BillingDetailsForm {
  email: string;
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

function Field({label, value, onChangeText, multiline, select}: {label: string; value: string; onChangeText: (value: string) => void; multiline?: boolean; select?: boolean}) {
  const COLORS = useThemeColors();
  return (
    <View style={{gap: 8}}>
      <Text style={{...TYPE.label, color: COLORS.textStrong}}>{label}</Text>
      <View>
        <BottomSheetTextInput
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          keyboardType={label.includes('email') ? 'email-address' : 'default'}
          autoCapitalize={label.includes('email') ? 'none' : 'words'}
          style={{
            minHeight: multiline ? 88 : 48,
            height: multiline ? 88 : 48,
            borderRadius: 12 /* INPUT_RADIUS */,
            borderWidth: 1,
            borderColor: COLORS.strokeWeak,
            backgroundColor: COLORS.card,
            paddingHorizontal: 16,
            paddingRight: select ? 42 : 16,
            paddingVertical: multiline ? 12 : 0,
            ...TYPE.input,
            color: COLORS.textStrong,
            textAlignVertical: multiline ? 'top' : 'center',
          }}
        />
        {select ? (
          <View pointerEvents="none" style={{position: 'absolute', right: 14, top: 14}}>
            <ChevronDown size={20} color={COLORS.textBase}/>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function EditBillingDetailsSheet({
  profile,
  onSave,
  onClose,
  expandSheet,
  canManage,
  onUpgrade,
}: {
  profile: BillingProfile;
  onSave?: (values: BillingDetailsForm) => Promise<void>;
  onClose: () => void;
  expandSheet?: () => void;
  canManage?: boolean;
  onUpgrade?: () => void;
}) {
  const COLORS = useThemeColors();
  const insets = useSafeAreaInsets();
  const address = profile.address;
  const [values, setValues] = useState<BillingDetailsForm>({
    email: profile.email ?? '',
    name: profile.name ?? '',
    line1: address?.line1 ?? '',
    line2: address?.line2 ?? '',
    city: address?.city ?? '',
    state: address?.state ?? '',
    postalCode: address?.postalCode ?? '',
    country: address?.country ?? '',
  });
  const [saving, setSaving] = useState(false);
  const set = useCallback((key: keyof BillingDetailsForm, value: string) => setValues(current => ({...current, [key]: value})), []);
  const submit = useCallback(async () => {
    setSaving(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (onSave) {
        await onSave(values);
      } else if (!canManage) {
        onClose();
        onUpgrade?.();
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } finally {
      setSaving(false);
    }
  }, [canManage, onClose, onSave, onUpgrade, values]);

  return (
    <View style={{flex: 1}}>
      <SheetHeader title="Edit billing details" onClose={onClose} closeLabel="Close billing details" style={{paddingHorizontal: 20}}/>
      <BottomSheetScrollView
        style={{flex: 1}}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={expandSheet}
        contentContainerStyle={{paddingHorizontal: 20, paddingTop: SHEET_GROUP_GAP, paddingBottom: SHEET_GROUP_GAP - 12, gap: SHEET_SECTION_GAP}}
      >
        <Field label="Billing email address" value={values.email} onChangeText={value => set('email', value)}/>
        <Field label="Full name" value={values.name} onChangeText={value => set('name', value)}/>
        <Field label="Street address" value={values.line1} onChangeText={value => set('line1', value)}/>
        <Field label="City" value={values.city} onChangeText={value => set('city', value)}/>
        <Field label="Postal code" value={values.postalCode} onChangeText={value => set('postalCode', value)}/>
        <Field label="Country" value={values.country} onChangeText={value => set('country', value)} select/>
      </BottomSheetScrollView>
      <View style={{flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: getSheetActionsBottomPadding(insets.bottom), backgroundColor: COLORS.sheet}}>
        <Button variant="secondary" size="lg" rounded="full" className="h-14 flex-1" onPress={onClose}>Dismiss</Button>
        <Button size="lg" rounded="full" className="h-14 flex-1" loading={saving} onPress={() => void submit()}>Save changes</Button>
      </View>
    </View>
  );
}
