import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { router } from 'expo-router';
import { useUiStore } from '@/store';
import { useDeleteMemory } from '@/hooks/mutations/use-memory-mutations';
import { COLORS, FONTS } from '@/constants/tokens';

export function ChatActionsSheet() {
  const closeSheet = useUiStore((s) => s.closeSheet);
  const { sheetProps } = useUiStore();
  const { mutate: deleteMemory, isPending } = useDeleteMemory();

  const chatId = sheetProps?.chatId;

  const handleDelete = () => {
    if (!chatId) return;
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteMemory(chatId, {
              onSuccess: () => {
                closeSheet();
                router.replace('/(tabs)/chat');
              },
            });
          },
        },
      ]
    );
  };

  return (
    <View className="px-5 pb-8 pt-2">
      <View className="flex-row items-center justify-between mb-4 border-b border-stroke-weaker pb-3">
        <Text className="text-xl text-text-strong" style={{ fontFamily: FONTS.serif }}>
          Conversation Options
        </Text>
      </View>

      <View className="gap-2 mt-2">
        <TouchableOpacity
          onPress={handleDelete}
          disabled={isPending}
          className="flex-row items-center gap-4 p-5 rounded-[24px] bg-white border border-stroke-weaker shadow-sm"
          style={{ borderColor: `${COLORS.error}10` }}
        >
          <View className="size-11 rounded-2xl items-center justify-center" style={{ backgroundColor: `${COLORS.error}10` }}>
            <Trash2 size={20} color={COLORS.error} strokeWidth={1.5} />
          </View>
          <View className="flex-1">
            <Text className="text-base" style={{ fontFamily: FONTS.sansMedium, color: COLORS.error }}>
              Delete Conversation
            </Text>
            <Text className="text-xs text-text-weak mt-0.5" style={{ fontFamily: FONTS.sans }}>
              Permanently remove this chat
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}
