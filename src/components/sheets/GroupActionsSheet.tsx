import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Edit3, Trash2, X, Users } from 'lucide-react-native';
import { COLORS, FONTS } from '@/constants/tokens';
import { useUiStore } from '@/store';
import { useDeleteGroup } from '@/hooks/mutations/use-group-mutations';
import * as Haptics from 'expo-haptics';

export function GroupActionsSheet() {
  const sheetProps = useUiStore((s) => s.sheetProps);
  const closeSheet = useUiStore((s) => s.closeSheet);
  const openSheet = useUiStore((s) => s.openSheet);
  const group = sheetProps?.group;
  const { mutate: deleteGroup, isPending } = useDeleteGroup();

  if (!group) return null;

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    closeSheet();
    setTimeout(() => {
      openSheet('create-group', { editData: group });
    }, 300);
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Delete Circle',
      `Are you sure you want to delete the circle "${group.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteGroup(group._id, {
              onSuccess: () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                closeSheet();
              },
            });
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 px-5 pb-8">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-6 pb-4 border-b border-stroke-weaker">
        <View className="flex-row items-center gap-3">
          <View className="size-10 bg-brand/10 rounded-full items-center justify-center border border-brand/20">
            <Users size={20} color={COLORS.brand} />
          </View>
          <View>
            <Text className="text-lg text-text-strong" style={{ fontFamily: FONTS.serif }}>
              {group.name}
            </Text>
            <Text className="text-xs text-text-weak" style={{ fontFamily: FONTS.sans }}>
              {group.members?.length || 0} members
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={closeSheet} className="p-2 rounded-full bg-fill-weaker">
          <X size={20} color={COLORS.textWeak} />
        </TouchableOpacity>
      </View>

      <BottomSheetScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        <TouchableOpacity
          onPress={handleEdit}
          className="flex-row items-center gap-4 p-4 rounded-2xl bg-fill-weaker border border-stroke-weaker"
        >
          <View className="size-10 rounded-full bg-white items-center justify-center border border-stroke-weaker">
            <Edit3 size={18} color={COLORS.textBase} />
          </View>
          <View className="flex-1">
            <Text className="text-base text-text-strong" style={{ fontFamily: FONTS.sansMedium }}>
              Edit Circle
            </Text>
            <Text className="text-sm text-text-weak" style={{ fontFamily: FONTS.sans }}>
              Update name, description, or members
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDelete}
          disabled={isPending}
          className="flex-row items-center gap-4 p-4 rounded-2xl bg-error/10 border border-error/20"
        >
          <View className="size-10 rounded-full bg-white items-center justify-center border border-error/20">
            <Trash2 size={18} color={COLORS.error} />
          </View>
          <View className="flex-1">
            <Text className="text-base text-error-strong" style={{ fontFamily: FONTS.sansMedium }}>
              {isPending ? 'Deleting...' : 'Delete Circle'}
            </Text>
            <Text className="text-sm text-error/80" style={{ fontFamily: FONTS.sans }}>
              Remove this circle permanently
            </Text>
          </View>
        </TouchableOpacity>
      </BottomSheetScrollView>
    </View>
  );
}
