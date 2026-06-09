import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useUiStore } from '@/store';
import dayjs from 'dayjs';
import { FONTS } from '@/constants/tokens';

export function MemoryDetailSheet() {
  const closeSheet = useUiStore((s) => s.closeSheet);
  const sheetProps = useUiStore((s) => s.sheetProps);
  const memory = sheetProps?.memory;

  if (!memory) return null;

  return (
    <View className="px-5 pb-8 pt-2">
      <View className="flex-row items-center justify-between mb-4 border-b border-stroke-weaker pb-3">
        <Text className="text-xl text-text-strong" style={{ fontFamily: FONTS.serif }}>
          Details
        </Text>
      </View>

      <BottomSheetScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-6 pt-2 pb-10">
        <View className="gap-1">
          <Text className="text-xs text-text-weak uppercase tracking-widest font-semibold">Title</Text>
          <Text className="text-base text-text-strong" style={{ fontFamily: FONTS.sansMedium }}>{memory.title}</Text>
        </View>

        <View className="gap-1">
          <Text className="text-xs text-text-weak uppercase tracking-widest font-semibold">Created At</Text>
          <Text className="text-base text-text-strong" style={{ fontFamily: FONTS.sans }}>
            {dayjs(memory.created_at).format('MMMM D, YYYY')}
          </Text>
        </View>

        <View className="gap-1">
          <Text className="text-xs text-text-weak uppercase tracking-widest font-semibold">Beneficiaries</Text>
          <Text className="text-base text-text-strong" style={{ fontFamily: FONTS.sans }}>
            {memory.beneficiaries?.length ? `${memory.beneficiaries.length} people` : 'Private'}
          </Text>
        </View>
        
        {/* Placeholder for tags and media stats */}
        <View className="gap-1">
          <Text className="text-xs text-text-weak uppercase tracking-widest font-semibold">Attached Media</Text>
          <Text className="text-base text-text-strong" style={{ fontFamily: FONTS.sans }}>
            {memory.attachments?.length || 0} files
          </Text>
        </View>
      </BottomSheetScrollView>
    </View>
  );
}
