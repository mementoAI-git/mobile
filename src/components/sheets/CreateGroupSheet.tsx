import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { BottomSheetTextInput, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { X, Check, Users } from 'lucide-react-native';
import { COLORS, FONTS } from '@/constants/tokens';
import { Button, Spinner } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useBeneficiaries } from '@/hooks/queries/use-beneficiaries';
import { useCreateGroup, useUpdateGroup, useAddGroupMembers } from '@/hooks/mutations/use-group-mutations';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { IGroup } from '@/types';

interface Props {
  onClose: () => void;
  editData?: IGroup;
}

export function CreateGroupSheet({ onClose, editData }: Props) {
  const isEdit = !!editData?._id;
  const insets = useSafeAreaInsets();
  const { toast } = useToast();
  const [name, setName] = useState(editData?.name || '');
  const [description, setDescription] = useState(editData?.description || '');
  
  // Extract existing member IDs
  const initialMembers = editData?.members?.map((m: any) => typeof m === 'string' ? m : m.user?._id || m._id).filter(Boolean) || [];
  const [selectedIds, setSelectedIds] = useState<string[]>(initialMembers);
  
  const { data: beneficiariesData, isLoading: loadingBeneficiaries } = useBeneficiaries();
  
  const { mutateAsync: createGroup, isPending: isCreating } = useCreateGroup();
  const { mutateAsync: updateGroup, isPending: isUpdating } = useUpdateGroup(editData?._id || '');
  const { mutateAsync: updateMembers, isPending: isUpdatingMembers } = useAddGroupMembers(editData?._id || '');

  const beneficiariesList = useMemo(() => {
    if (Array.isArray(beneficiariesData)) return beneficiariesData;
    if ((beneficiariesData as any)?.docs) return (beneficiariesData as any).docs;
    return [];
  }, [beneficiariesData]);

  const toggleSelection = (id: string) => {
    Haptics.selectionAsync();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (isEdit) {
        // 1. Update Group Details
        await updateGroup({ name: name.trim(), description: description.trim() });
        // 2. Update Members
        await updateMembers({ beneficiaryIds: selectedIds });
        onClose();
      } else {
        // 1. Create Group
        const res = await createGroup({ name: name.trim(), description: description.trim() });
        const groupId = (res as any)?.data?._id || (res as any)?._id;
        if (groupId && selectedIds.length > 0) {
          // Wait briefly, then update members using the generic mutation (but we need the ID)
          // Since our hook uses the editData._id which is null on creation, we shouldn't use the hook directly for the new ID if it's strictly bound.
          // Let's import the endpoint and 'post' directly for the new group members, or rely on a different approach.
          const { post } = require('@/api/mutations');
          const endpoint = require('@/api/endpoint').default;
          await post(endpoint.groupMembers.replace(':id', groupId), { beneficiaryIds: selectedIds });
        }
        onClose();
      }
    } catch (err: any) {
      toast(err?.message || 'Failed to save group.', 'error');
    }
  };

  const isPending = isCreating || isUpdating || isUpdatingMembers;

  return (
    <BottomSheetScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom ? insets.bottom + 24 : 60 }}>
      {/* Header */}
      <View className="px-6 pt-2 pb-4 flex-row items-center justify-between border-b border-stroke-weaker">
        <Text className="text-xl text-text-strong" style={{ fontFamily: FONTS.serif }}>
          {isEdit ? 'Edit Circle' : 'Create Circle'}
        </Text>
        <TouchableOpacity onPress={onClose} className="p-2 rounded-full bg-fill-weaker">
          <X size={18} color={COLORS.textWeak} />
        </TouchableOpacity>
      </View>

      <View className="px-6 pt-6 gap-6">
        {/* Name Input */}
        <View className="gap-2">
          <Text className="text-xs text-text-weak uppercase tracking-widest font-bold" style={{ fontFamily: FONTS.sansBold }}>
            Circle Name
          </Text>
          <BottomSheetTextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Family, Close Friends"
            placeholderTextColor={COLORS.textMuted}
            className="h-14 bg-fill-weaker border border-stroke-weaker rounded-2xl px-4 text-base text-text-strong"
            style={{ fontFamily: FONTS.sansMedium }}
          />
        </View>

        {/* Description Input */}
        <View className="gap-2">
          <Text className="text-xs text-text-weak uppercase tracking-widest font-bold" style={{ fontFamily: FONTS.sansBold }}>
            Description (Optional)
          </Text>
          <BottomSheetTextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What is this circle for?"
            placeholderTextColor={COLORS.textMuted}
            multiline
            className="min-h-[100px] bg-fill-weaker border border-stroke-weaker rounded-2xl px-4 py-4 text-base text-text-strong"
            style={{ fontFamily: FONTS.sans, textAlignVertical: 'top' }}
          />
        </View>

        {/* Members Selection */}
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-text-weak uppercase tracking-widest font-bold" style={{ fontFamily: FONTS.sansBold }}>
              Select Members
            </Text>
            <Text className="text-xs text-brand font-bold" style={{ fontFamily: FONTS.sansBold }}>
              {selectedIds.length} Selected
            </Text>
          </View>
          
          <View className="bg-fill-weaker border border-stroke-weaker rounded-[24px] p-2">
            {loadingBeneficiaries ? (
              <View className="py-8 items-center justify-center">
                <Spinner />
              </View>
            ) : beneficiariesList.length > 0 ? (
              beneficiariesList.map((b: any, i: number) => {
                const bId = b._id;
                if (!bId) return null;
                const isSelected = selectedIds.includes(bId);
                return (
                  <TouchableOpacity
                    key={bId}
                    onPress={() => toggleSelection(bId)}
                    className={`flex-row items-center justify-between p-3 rounded-2xl ${isSelected ? 'bg-white shadow-sm' : ''}`}
                  >
                    <View className="flex-row items-center gap-3 flex-1">
                      <View className="size-10 rounded-full bg-brand/10 items-center justify-center border border-brand/20">
                        <Users size={18} color={COLORS.brand} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-base text-text-strong" numberOfLines={1} style={{ fontFamily: FONTS.sansMedium }}>
                          {b.name || b.first_name || b.email}
                        </Text>
                        <Text className="text-xs text-text-weak" style={{ fontFamily: FONTS.sans }}>
                          {b.relationship || 'Trustee'}
                        </Text>
                      </View>
                    </View>
                    {isSelected && (
                      <View className="size-6 bg-brand rounded-full items-center justify-center">
                        <Check size={14} color="white" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            ) : (
              <View className="py-8 items-center justify-center gap-2">
                <Text className="text-sm text-text-weak text-center" style={{ fontFamily: FONTS.sans }}>
                  You don't have any trustees yet.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Action Button */}
        <Button
          onPress={handleSave}
          loading={isPending}
          disabled={!name.trim() || isPending}
          size="lg"
          className="h-14 bg-brand rounded-full mt-2"
        >
          <Text className="text-white font-bold" style={{ fontFamily: FONTS.sansBold }}>
            {isEdit ? 'Save Changes' : 'Create Circle'}
          </Text>
        </Button>
      </View>
    </BottomSheetScrollView>
  );
}
