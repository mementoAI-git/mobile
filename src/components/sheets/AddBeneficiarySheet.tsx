import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { SheetHeader } from './SheetHeader';
import { SHEET_GROUP_GAP, SHEET_SECTION_GAP, getSheetActionsBottomPadding } from '@/features/layout/sheet-safe-area';
import { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import Check from 'lucide-react-native/icons/check';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { COLORS as LIGHT_COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { INPUT_RADIUS } from '@/components/ui/TextInput';
import {
  buildBeneficiaryInvitePayload,
  buildBeneficiaryUpdatePayload,
  GROUP_COLOR_PALETTE,
} from '@/features/beneficiaries/sheet-forms';
import { isInvitePending } from '@/features/beneficiaries/people-cards';
import { normalizeCollection } from '@/features/beneficiaries/collections';
import { useAddBeneficiary, useUpdateBeneficiary } from '@/hooks/mutations/use-beneficiary-mutations';
import { useGroups } from '@/hooks/queries/use-groups';
import type { IBeneficiary, IGroup } from '@/types';

interface Props {
  onClose: () => void;
  editData?: IBeneficiary;
}

function Field({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof BottomSheetTextInput>) {
  const COLORS = useThemeColors();
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ ...TYPE.label, color: COLORS.textStrong }}>{label}</Text>
      <BottomSheetTextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={COLORS.textMuted}
        style={[
          {
            height: 52,
            borderRadius: INPUT_RADIUS,
            borderWidth: 1,
            borderColor: COLORS.strokeWeak,
            backgroundColor: COLORS.fillWeaker,
            paddingHorizontal: 16,
            ...TYPE.input,
            color: props.editable === false ? COLORS.textMuted : COLORS.textStrong,
          },
          props.style,
        ]}
      />
    </View>
  );
}

/**
 * Mirrors web "Invite person" (add-beneficiary, connection mode) and
 * "Edit beneficiary": name, email and relationship, plus groups when inviting.
 */
export function AddBeneficiarySheet({ onClose, editData }: Props) {
  const COLORS = useThemeColors();
  const insets = useSafeAreaInsets();
  const isEdit = Boolean(editData?._id);
  // Web locks the email once the person has accepted.
  const emailLocked = isEdit && !isInvitePending(editData ?? {});
  const [email, setEmail] = useState(editData?.email || '');
  const [name, setName] = useState(editData?.name || '');
  const [relationship, setRelationship] = useState(editData?.relationship || '');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const addBeneficiary = useAddBeneficiary();
  const updateBeneficiary = useUpdateBeneficiary();
  const { data: groupsData } = useGroups();
  const groups = useMemo(() => normalizeCollection<IGroup>(groupsData), [groupsData]);

  const toggleGroup = useCallback((groupId: string) => {
    Haptics.selectionAsync();
    setSelectedGroupIds((current) => (
      current.includes(groupId) ? current.filter((id) => id !== groupId) : [...current, groupId]
    ));
  }, []);

  const payload = isEdit
    ? buildBeneficiaryUpdatePayload({ email, name, relationship })
    : buildBeneficiaryInvitePayload({ email, name, relationship, groupIds: selectedGroupIds });
  const isPending = addBeneficiary.isPending || updateBeneficiary.isPending;

  const submit = useCallback(async () => {
    if (!payload || isPending) {
      toast('Add a name, a valid email and a relationship.', 'error');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (isEdit) {
        await updateBeneficiary.mutateAsync({ ...payload, id: editData?._id ?? '' });
        toast('Changes saved.', 'success');
      } else {
        await addBeneficiary.mutateAsync(payload);
        toast(`Invite sent to ${payload.name}.`, 'success');
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error: any) {
      toast(error?.message || 'Couldn’t save this person. Try again.', 'error');
    }
  }, [addBeneficiary, editData?._id, isEdit, isPending, onClose, payload, updateBeneficiary]);

  return (
    <View style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SheetHeader
          title={isEdit ? 'Edit person' : 'Invite person'}
          onClose={onClose}
          style={{ paddingHorizontal: 20 }}
        />

        <BottomSheetScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: SHEET_GROUP_GAP, paddingBottom: SHEET_GROUP_GAP - 12, gap: SHEET_SECTION_GAP }}
        >
          <Field label="Name" value={name} onChangeText={setName} placeholder="John Doe" autoCapitalize="words" textContentType="name" />
          <Field
            label="Email address"
            value={email}
            onChangeText={setEmail}
            placeholder="example@gmail.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            editable={!emailLocked}
          />
          <Field
            label={isEdit ? 'Relationship (this person to you)' : 'Relationship'}
            value={relationship}
            onChangeText={setRelationship}
            placeholder="Brother, Friend, Spouse…"
            autoCapitalize="words"
          />

          {!isEdit && groups.length > 0 ? (
            <View style={{ gap: 12 }} accessibilityRole="list" accessibilityLabel="Add to groups">
              <Text style={{ ...TYPE.label, color: COLORS.textStrong }}>Add to groups</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {groups.map((group) => {
                  const selected = selectedGroupIds.includes(group._id);
                  const color = GROUP_COLOR_PALETTE[group.color ?? 1]?.color ?? GROUP_COLOR_PALETTE[1].color;
                  return (
                    <TouchableOpacity
                      key={group._id}
                      onPress={() => toggleGroup(group._id)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      style={{ minHeight: 36, paddingHorizontal: 12, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: color }}
                    >
                      {selected ? <Check size={14} color={LIGHT_COLORS.textStrong} strokeWidth={2.5} /> : null}
                      {/* Web --group-on-color: dark ink on the pastel group colours. */}
                      <Text style={{ ...TYPE.buttonSmall, color: LIGHT_COLORS.textStrong }}>{group.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}
        </BottomSheetScrollView>

        <View style={{
          flexDirection: 'row',
          gap: 12,
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: getSheetActionsBottomPadding(insets.bottom),
          backgroundColor: COLORS.sheet,
        }}>
          <Button variant="secondary" size="lg" rounded="full" className="h-14 flex-1" onPress={onClose}>
            Cancel
          </Button>
          <Button
            size="lg"
            rounded="full"
            className="h-14 flex-1"
            loading={isPending}
            disabled={!payload || isPending}
            onPress={() => void submit()}
          >
            {isEdit ? 'Save changes' : 'Send invite'}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
