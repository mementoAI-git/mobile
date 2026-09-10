import React, { useCallback, useMemo, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Text, TouchableOpacity, View } from 'react-native';
import { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Check, Pencil, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';

import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { buildBeneficiaryInvitePayload, GROUP_COLOR_PALETTE } from '@/features/beneficiaries/sheet-forms';
import {
  VAULT_ACCESS_OPTIONS,
  type VaultAccessScope,
} from '@/features/beneficiaries/vault-permissions';
import { isPermissionGranted } from '@/lib/permission-recovery';
import { showPermissionRecoveryAlert } from '@/lib/show-permission-recovery-alert';
import { useAddBeneficiary } from '@/hooks/mutations/use-beneficiary-mutations';
import { useFileUpload } from '@/hooks/use-file-upload';
import { useGroups } from '@/hooks/queries/use-groups';
import type { IBeneficiary, IGroup } from '@/types';
import { useUpdateBeneficiary } from '@/hooks/mutations/use-beneficiary-mutations';

interface Props {
  onClose: () => void;
  editData?: IBeneficiary;
}

interface PickedAvatar {
  uri: string;
  name: string;
  mimeType: string;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ ...TYPE.label, color: COLORS.textStrong }}>
      {children}
    </Text>
  );
}

function SheetInput({
  multiline,
  style,
  ...props
}: React.ComponentProps<typeof BottomSheetTextInput>) {
  return (
    <BottomSheetTextInput
      {...props}
      multiline={multiline}
      placeholderTextColor={COLORS.textMuted}
      style={[
        {
          minHeight: multiline ? 132 : 56,
          borderWidth: 1,
          borderColor: COLORS.strokeWeak,
          borderRadius: multiline ? 16 : 12,
          backgroundColor: COLORS.card,
          paddingHorizontal: 16,
          paddingVertical: multiline ? 14 : 0,
          ...TYPE.bodyLarge,
          color: COLORS.textStrong,
          textAlignVertical: multiline ? 'top' : 'center',
        },
        style,
      ]}
    />
  );
}

export function AddBeneficiarySheet({ onClose, editData }: Props) {
  const isEdit = Boolean(editData?._id || editData?.email);
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState(editData?.email || '');
  const [name, setName] = useState(editData?.name || '');
  const [relationship, setRelationship] = useState(editData?.relationship || '');
  const [about, setAbout] = useState(editData?.about || '');
  const [groupSearch, setGroupSearch] = useState('');

  const initialGroups = useMemo(() => {
    if (!editData?.groups) return [];
    return editData.groups.map(g => typeof g === 'string' ? g : (g as any)._id).filter(Boolean);
  }, [editData]);

  const [accessScope, setAccessScope] = useState<VaultAccessScope>(
    (editData as any)?.access_scope || 'full_vault'
  );
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(initialGroups);
  const [avatar, setAvatar] = useState<PickedAvatar | null>(null);
  const addBeneficiary = useAddBeneficiary();
  const { mutateAsync: updateBeneficiary } = useUpdateBeneficiary();
  const { uploadFile, isUploading } = useFileUpload();
  const { data: groupsData } = useGroups();

  const groups = useMemo<IGroup[]>(() => {
    if (Array.isArray(groupsData)) return groupsData;
    return Array.isArray((groupsData as any)?.docs) ? (groupsData as any).docs : [];
  }, [groupsData]);

  const filteredGroups = useMemo(() => {
    const query = groupSearch.trim().toLowerCase();
    if (!query) return groups;
    return groups.filter((group) => group.name.toLowerCase().includes(query));
  }, [groupSearch, groups]);

  const close = useCallback(() => {
    onClose();
  }, [onClose]);

  const pickAvatar = useCallback(async () => {
    Haptics.selectionAsync();
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!isPermissionGranted(permission)) {
      showPermissionRecoveryAlert({
        permission,
        title: 'Your photos are tucked away',
        description: 'Allow photo access to choose a beneficiary picture.',
        settingsDescription: 'Photo access is turned off in Settings. Turn it back on to choose a beneficiary picture.',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.82,
    });
    if (result.canceled || !result.assets.length) return;
    const asset = result.assets[0];
    setAvatar({
      uri: asset.uri,
      name: asset.fileName ?? `beneficiary-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
  }, []);

  const toggleGroup = useCallback((groupId: string) => {
    Haptics.selectionAsync();
    setSelectedGroupIds((current) => (
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId]
    ));
  }, []);

  const [isUpdating, setIsUpdating] = useState(false);
  const isPending = addBeneficiary.isPending || isUploading || isUpdating;
  const canSubmit = Boolean(buildBeneficiaryInvitePayload({
    email,
    name,
    relationship,
    about,
    groupIds: selectedGroupIds,
  }));

  const submit = useCallback(async () => {
    const basePayload = buildBeneficiaryInvitePayload({
      email,
      name,
      relationship,
      about,
      groupIds: selectedGroupIds,
    });
    if (!basePayload) {
      toast('Add a valid email, name, and relationship.', 'error');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    let avatarFileId: string | undefined;
    if (avatar) {
      const uploaded = await uploadFile(avatar.uri, avatar.mimeType, avatar.name);
      if (!uploaded?._id) return;
      avatarFileId = uploaded._id;
    }

    const payload = buildBeneficiaryInvitePayload({
      email,
      name,
      relationship,
      about,
      avatarFileId,
      groupIds: selectedGroupIds,
      accessScope,
    });
    if (!payload) return;

    try {
      if (isEdit) {
        setIsUpdating(true);
        // Ensure email isn't accidentally modified in payload for edits
        await updateBeneficiary({ ...payload, id: editData?._id ?? editData?.email ?? '' });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onClose();
      } else {
        await addBeneficiary.mutateAsync(payload);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onClose();
      }
    } catch (error: any) {
      toast(error?.message || 'Couldn’t save beneficiary. Try again.', 'error');
    } finally {
      setIsUpdating(false);
    }
  }, [about, accessScope, addBeneficiary, updateBeneficiary, isEdit, editData, avatar, email, name, onClose, relationship, selectedGroupIds, uploadFile]);

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
        disabled={!canSubmit || isPending}
        onPress={() => void submit()}
      >
        {isEdit ? 'Save changes' : 'Send invite'}
      </Button>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1 }}>
          <View style={{ minHeight: 68, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ ...TYPE.sectionTitle, color: COLORS.textStrong }}>
              {isEdit ? 'Edit Beneficiary' : 'Invite Beneficiary'}
            </Text>
            <TouchableOpacity onPress={() => { Haptics.selectionAsync(); close(); }} accessibilityRole="button" accessibilityLabel="Close invite beneficiary" style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.fillWeak }}>
              <X size={22} color={COLORS.textStrong} />
            </TouchableOpacity>
          </View>

          <BottomSheetScrollView
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, gap: 20 }}
          >
            <TouchableOpacity onPress={pickAvatar} activeOpacity={0.82} style={{ width: 74, height: 74, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.fillWeak }}>
              {avatar ? (
                <Image source={{ uri: avatar.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : isEdit && (editData as any)?.avatar ? (
                <Image source={{ uri: (editData as any).avatar }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <Pencil size={24} color={COLORS.textStrong} strokeWidth={1.8} />
              )}
            </TouchableOpacity>

            <View style={{ gap: 8 }}>
              <FieldLabel>Email address</FieldLabel>
              <SheetInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isEdit}
                style={isEdit ? { color: COLORS.textMuted } : undefined}
              />
            </View>
            <View style={{ gap: 8 }}>
              <FieldLabel>Beneficiary name</FieldLabel>
              <SheetInput value={name} onChangeText={setName} autoCapitalize="words" />
            </View>
            <View style={{ gap: 8 }}>
              <FieldLabel>Relationship</FieldLabel>
              <SheetInput value={relationship} onChangeText={setRelationship} autoCapitalize="words" />
            </View>
            <View style={{ gap: 8 }}>
              <FieldLabel>About</FieldLabel>
              <SheetInput value={about} onChangeText={setAbout} multiline placeholder="Enter a short description of this person here" />
            </View>

            <View style={{ gap: 10 }}>
              <FieldLabel>Vault access level</FieldLabel>
              <View style={{ gap: 8 }}>
                {VAULT_ACCESS_OPTIONS.map((option) => {
                  const selected = accessScope === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setAccessScope(option.value);
                      }}
                      activeOpacity={0.76}
                      style={{
                        padding: 14,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: selected ? COLORS.brand : COLORS.strokeWeak,
                        backgroundColor: selected ? 'rgba(255, 94, 0, 0.04)' : COLORS.card,
                        gap: 3,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text
                          style={{
                            ...TYPE.body,
                            color: selected ? COLORS.brand : COLORS.textStrong,
                          }}
                        >
                          {option.title}
                        </Text>
                        <View
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 9,
                            borderWidth: 2,
                            borderColor: selected ? COLORS.brand : COLORS.strokeWeak,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {selected ? (
                            <View
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: COLORS.brand,
                              }}
                            />
                          ) : null}
                        </View>
                      </View>
                      <Text
                        style={{
                          ...TYPE.bodySmall,
                          color: COLORS.textWeak,
                          lineHeight: 18,
                        }}
                      >
                        {option.description}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <FieldLabel>Add to group(s)</FieldLabel>
              <View style={{ minHeight: 132, borderWidth: 1, borderColor: COLORS.strokeWeak, borderRadius: 16, backgroundColor: COLORS.card, padding: 12, gap: 10 }}>
                <BottomSheetTextInput
                  value={groupSearch}
                  onChangeText={setGroupSearch}
                  placeholder="Search group name to add user to"
                  placeholderTextColor={COLORS.textMuted}
                  style={{ minHeight: 38, padding: 0, ...TYPE.body, color: COLORS.textStrong }}
                />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {filteredGroups.slice(0, 6).map((group) => {
                    const selected = selectedGroupIds.includes(group._id);
                    const color = GROUP_COLOR_PALETTE[group.color ?? 1]?.color ?? GROUP_COLOR_PALETTE[1].color;
                    return (
                      <TouchableOpacity key={group._id} onPress={() => toggleGroup(group._id)} style={{ minHeight: 34, paddingHorizontal: 10, borderRadius: 17, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: selected ? color : COLORS.fillWeak, borderWidth: 1, borderColor: selected ? color : COLORS.strokeWeaker }}>
                        {selected ? <Check size={14} color={COLORS.textStrong} strokeWidth={2.5} /> : null}
                        <Text style={{ ...TYPE.metadata, color: COLORS.textStrong }}>{group.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          </BottomSheetScrollView>

          {footer}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
