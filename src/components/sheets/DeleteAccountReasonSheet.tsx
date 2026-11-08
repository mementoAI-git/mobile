import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { Button, TextInput } from '@/components/ui';
import { TYPE } from '@/constants/typography';
import { SheetHeader } from './SheetHeader';
import { SHEET_GROUP_GAP, SHEET_SECTION_GAP } from '@/features/layout/sheet-safe-area';
import { DELETION_REASONS, type DeletionReason } from '@/features/account-deletion/deletion';

interface Props {
  reason: DeletionReason | null;
  details: string;
  onSave: (reason: DeletionReason | null, details: string) => void;
  onClose?: () => void;
}

/** "Choose a reason": radio list, plus "Tell us more" for Something else. */
export function DeleteAccountReasonSheet({ reason: initialReason, details: initialDetails, onSave, onClose }: Props) {
  const COLORS = useThemeColors();
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState<DeletionReason | null>(initialReason);
  const [details, setDetails] = useState(initialDetails);

  const choose = useCallback((value: DeletionReason) => {
    Haptics.selectionAsync();
    setReason(value);
  }, []);

  const save = useCallback(() => {
    Haptics.selectionAsync();
    onSave(reason, reason === 'other' ? details : '');
    onClose?.();
  }, [details, onClose, onSave, reason]);

  return (
    <View style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SheetHeader title="Choose a reason" onClose={() => onClose?.()} style={{ paddingHorizontal: 20 }} />

        <BottomSheetScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: SHEET_GROUP_GAP, paddingBottom: SHEET_GROUP_GAP - 12, gap: SHEET_SECTION_GAP }}
        >
          <View
            accessibilityRole="radiogroup"
            style={{ padding: 20, borderRadius: 20, borderWidth: 1, borderColor: COLORS.strokeWeak, backgroundColor: COLORS.settingsCard, gap: 4 }}
          >
            <Text style={{ ...TYPE.bodyLarge, color: COLORS.textStrong, marginBottom: 8 }}>Tell us why you’re leaving</Text>
            {DELETION_REASONS.map((item) => {
              const checked = reason === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => choose(item.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked }}
                  style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 1.5,
                      borderColor: checked ? COLORS.brand : COLORS.strokeStrong,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {checked ? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.brand }} /> : null}
                  </View>
                  <Text style={{ ...TYPE.body, color: COLORS.textStrong, flex: 1 }}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {reason === 'other' ? (
            <TextInput
              bordered
              InputComponent={BottomSheetTextInput}
              label="Tell us more"
              value={details}
              onChangeText={setDetails}
              placeholder="Tell us more about this"
              multiline
              maxLength={1000}
              textAlignVertical="top"
              inputClassName="min-h-[96px]"
            />
          ) : null}
        </BottomSheetScrollView>

        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12) + 8, backgroundColor: COLORS.sheet }}>
          <Button size="lg" rounded="full" className="h-14 w-full" onPress={save}>
            Continue
          </Button>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
