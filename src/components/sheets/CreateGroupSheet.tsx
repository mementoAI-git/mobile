import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, TouchableOpacity, View } from 'react-native';
import { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Check, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';

import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { buildGroupPayload, GROUP_COLOR_PALETTE } from '@/features/beneficiaries/sheet-forms';
import { useCreateGroup, useUpdateGroup } from '@/hooks/mutations/use-group-mutations';
import type { IGroup } from '@/types';

interface Props {
  onClose: () => void;
  editData?: IGroup;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ ...TYPE.label, color: COLORS.textStrong }}>
      {children}
    </Text>
  );
}

export function CreateGroupSheet({ onClose, editData }: Props) {
  const insets = useSafeAreaInsets();
  const isEdit = Boolean(editData?._id);
  const [name, setName] = useState(editData?.name ?? '');
  const [description, setDescription] = useState(editData?.description ?? '');
  const [color, setColor] = useState(editData?.color ?? 1);
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup(editData?._id ?? '');
  const isPending = createGroup.isPending || updateGroup.isPending;
  const payload = buildGroupPayload({ name, description, color });

  const close = useCallback(() => {
    onClose();
  }, [onClose]);

  const selectColor = useCallback((nextColor: number) => {
    Haptics.selectionAsync();
    setColor(nextColor);
  }, []);

  const submit = useCallback(async () => {
    const nextPayload = buildGroupPayload({ name, description, color });
    if (!nextPayload) {
      toast('Add a group name and choose a colour.', 'error');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (isEdit) {
        await updateGroup.mutateAsync(nextPayload);
      } else {
        await createGroup.mutateAsync(nextPayload);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch {
      // Mutation hooks own the warm error toast. Keep the form intact for retry.
    }
  }, [color, createGroup, description, isEdit, name, onClose, updateGroup]);

  const footer = (
    <View style={{
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: Math.max(insets.bottom, 12) + 8,
      borderTopWidth: 1,
      borderTopColor: COLORS.strokeWeaker,
      backgroundColor: COLORS.background,
    }}>
      <Button variant="secondary" size="lg" className="h-14 flex-1" onPress={close}>
        Dismiss
      </Button>
      <Button
        size="lg"
        className="h-14 flex-1 bg-fill-strong"
        textClassName="text-white"
        loading={isPending}
        disabled={!payload || isPending}
        onPress={() => void submit()}
      >
        {isEdit ? 'Save changes' : 'Create group'}
      </Button>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1 }}>
          <View style={{ minHeight: 68, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ ...TYPE.sectionTitle, color: COLORS.textStrong }}>
              {isEdit ? 'Group Settings' : 'Create Group'}
            </Text>
            <TouchableOpacity onPress={() => { Haptics.selectionAsync(); close(); }} accessibilityRole="button" accessibilityLabel="Close create group" style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.fillWeak }}>
              <X size={22} color={COLORS.textStrong} />
            </TouchableOpacity>
          </View>

          <BottomSheetScrollView
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28, gap: 20 }}
          >
            <View style={{ gap: 8 }}>
              <FieldLabel>Group name</FieldLabel>
              <BottomSheetTextInput
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                placeholderTextColor={COLORS.textMuted}
                style={{ height: 56, borderWidth: 1, borderColor: COLORS.strokeWeak, borderRadius: 12, backgroundColor: COLORS.card, paddingHorizontal: 16, ...TYPE.bodyLarge, color: COLORS.textStrong }}
              />
            </View>

            <View style={{ gap: 8 }}>
              <FieldLabel>Description (Optional)</FieldLabel>
              <BottomSheetTextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Enter description here"
                placeholderTextColor={COLORS.textMuted}
                multiline
                style={{ minHeight: 112, borderWidth: 1, borderColor: COLORS.strokeWeak, borderRadius: 16, backgroundColor: COLORS.card, paddingHorizontal: 16, paddingVertical: 14, ...TYPE.bodyLarge, color: COLORS.textStrong, textAlignVertical: 'top' }}
              />
            </View>

            <View style={{ gap: 14 }}>
              <FieldLabel>Group colour</FieldLabel>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {GROUP_COLOR_PALETTE.map((swatch) => {
                  const selected = color === swatch.id;
                  return (
                    <TouchableOpacity
                      key={swatch.id}
                      onPress={() => selectColor(swatch.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Select group colour ${swatch.id + 1}`}
                      accessibilityState={{ selected }}
                      style={{ width: 48, height: 48, borderRadius: 6, backgroundColor: swatch.color, alignItems: 'center', justifyContent: 'center' }}
                    >
                      {selected ? <Check size={24} color={COLORS.textInverse} strokeWidth={2.5} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </BottomSheetScrollView>

          {footer}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
