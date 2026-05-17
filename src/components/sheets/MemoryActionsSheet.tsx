import React from 'react';
import { View, Text, TouchableOpacity, Share } from 'react-native';
import { Edit2, Share as ShareIcon, BookmarkPlus, BookmarkMinus, Trash2, RotateCcw } from 'lucide-react-native';
import { useDeleteMemory, useBookmarkMemory, useRestoreMemory } from '@/hooks/mutations/use-memory-mutations';
import { IMemory } from '@/types';
import { useUiStore } from '@/store';
import { COLORS, FONTS } from '@/constants/tokens';

interface MemoryActionsSheetProps {
  memory: IMemory;
  onClose?: () => void;
}

export function MemoryActionsSheet({ memory, onClose }: MemoryActionsSheetProps) {
  const { openSheet } = useUiStore();
  const { mutate: deleteMemory, isPending: isDeleting } = useDeleteMemory();
  const { mutate: toggleBookmark, isPending: isBookmarking } = useBookmarkMemory();
  const { mutate: restoreMemory, isPending: isRestoring } = useRestoreMemory();

  const isDeleted = memory.status === 'deleted';

  const handleAction = (action: () => void) => {
    action();
    onClose?.();
  };

  const onEdit = () => {
    // Navigate to edit or open edit sheet
    // Web does: open("edit-memory", { memory })
    openSheet('create-memory', { editData: memory });
    onClose?.();
  };

  const onShare = async () => {
    try {
      await Share.share({
        message: `Check out my memory: ${memory.title || 'Untitled'}\n\nhttps://memento.app/stories/${memory._id}`,
      });
    } catch (error) {
      console.error(error);
    }
    onClose?.();
  };

  const onToggleBookmark = () => {
    toggleBookmark({ id: memory._id, bookmarked: memory.bookmarked || false });
    onClose?.();
  };

  const onDelete = () => {
    deleteMemory(memory._id);
    onClose?.();
  };

  const onRestore = () => {
    restoreMemory(memory._id);
    onClose?.();
  };

  return (
    <View className="flex-1 px-2">
      <Text className="text-sm font-medium text-text-weak mb-4 text-center" style={{ fontFamily: FONTS.sansMedium }}>
        Story Actions
      </Text>
      
      {isDeleted ? (
        <TouchableOpacity 
          className="flex-row items-center gap-3 p-4 bg-fill-weaker rounded-xl mb-3 active:bg-fill-weak"
          onPress={() => handleAction(onRestore)}
          disabled={isRestoring}
        >
          <RotateCcw size={20} color="rgba(23,11,0,0.8)" />
          <Text className="text-base text-text-strong font-medium" style={{ fontFamily: FONTS.sansMedium }}>Restore story</Text>
        </TouchableOpacity>
      ) : (
        <>
          <TouchableOpacity 
            className="flex-row items-center gap-3 p-4 bg-fill-weaker rounded-xl mb-3 active:bg-fill-weak"
            onPress={onEdit}
          >
            <Edit2 size={20} color="rgba(23,11,0,0.8)" />
            <Text className="text-base text-text-strong font-medium" style={{ fontFamily: FONTS.sansMedium }}>Edit story</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            className="flex-row items-center gap-3 p-4 bg-fill-weaker rounded-xl mb-3 active:bg-fill-weak"
            onPress={onShare}
          >
            <ShareIcon size={20} color="rgba(23,11,0,0.8)" />
            <Text className="text-base text-text-strong font-medium" style={{ fontFamily: FONTS.sansMedium }}>Share story</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            className="flex-row items-center gap-3 p-4 bg-fill-weaker rounded-xl mb-3 active:bg-fill-weak"
            onPress={onToggleBookmark}
            disabled={isBookmarking}
          >
            {memory.bookmarked ? (
              <BookmarkMinus size={20} color="rgba(23,11,0,0.8)" />
            ) : (
              <BookmarkPlus size={20} color="rgba(23,11,0,0.8)" />
            )}
            <Text className="text-base text-text-strong font-medium" style={{ fontFamily: FONTS.sansMedium }}>
              {memory.bookmarked ? 'Remove bookmark' : 'Add bookmark'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      <View className="h-[1px] bg-stroke-weaker my-2" />

      <TouchableOpacity 
        className="flex-row items-center gap-4 p-5 rounded-[24px] bg-white border border-stroke-weaker shadow-sm"
        style={{ borderColor: `${COLORS.error}10` }}
        onPress={() => handleAction(onDelete)}
        disabled={isDeleting}
      >
        <View className="size-11 rounded-2xl items-center justify-center" style={{ backgroundColor: `${COLORS.error}10` }}>
          <Trash2 size={20} color={COLORS.error} strokeWidth={1.5} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-medium" style={{ fontFamily: FONTS.sansMedium, color: COLORS.error }}>Delete story</Text>
          <Text className="text-xs text-text-weak mt-0.5" style={{ fontFamily: FONTS.sans }}>Permanently remove this memory</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}
