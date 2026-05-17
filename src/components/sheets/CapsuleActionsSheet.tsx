import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Edit2, Eye, Pause, Play, RotateCcw, Trash2 } from 'lucide-react-native';
import { useDeleteCapsule, useUpdateCapsule } from '@/hooks/mutations/use-capsule-mutations';
import { ICapsule } from '@/types';
import { useUiStore } from '@/store';
import { COLORS, FONTS } from '@/constants/tokens';

interface CapsuleActionsSheetProps {
  capsule: ICapsule;
  onClose?: () => void;
}

export function CapsuleActionsSheet({ capsule, onClose }: CapsuleActionsSheetProps) {
  const { openSheet } = useUiStore();
  const { mutate: deleteCapsule, isPending: isDeleting } = useDeleteCapsule();
  const { mutate: updateCapsule, isPending: isUpdating } = useUpdateCapsule(capsule._id);

  const isDeleted = capsule.status === 'deleted';
  const isDelivered = capsule.status === 'delivered';

  const handleAction = (action: () => void) => {
    action();
    onClose?.();
  };

  const onEdit = () => {
    onClose?.();
    setTimeout(() => {
      openSheet('create-capsule', { editData: capsule });
    }, 300);
  };

  const onView = () => {
    onClose?.();
    setTimeout(() => {
      openSheet('capsule-detail', { capsule, previewOnly: true });
    }, 300);
  };

  const onPause = () => {
    updateCapsule({ status: 'pause' });
    onClose?.();
  };

  const onResume = () => {
    updateCapsule({ status: 'scheduled' });
    onClose?.();
  };

  const onRestore = () => {
    // If the web has restore logic, it usually sets status back to draft or scheduled
    updateCapsule({ status: 'draft' }); 
    onClose?.();
  };

  const onDelete = () => {
    deleteCapsule(capsule._id);
    onClose?.();
  };

  return (
    <View className="flex-1 px-2">
      <Text className="text-sm font-medium text-text-weak mb-4 text-center" style={{ fontFamily: FONTS.sansMedium }}>
        Capsule Actions
      </Text>

      {isDeleted ? (
        <TouchableOpacity 
          className="flex-row items-center gap-3 p-4 bg-fill-weaker rounded-xl mb-3 active:bg-fill-weak"
          onPress={() => handleAction(onRestore)}
          disabled={isUpdating}
        >
          <RotateCcw size={20} color="rgba(23,11,0,0.8)" />
          <Text className="text-base text-text-strong font-medium" style={{ fontFamily: FONTS.sansMedium }}>Restore capsule</Text>
        </TouchableOpacity>
      ) : (
        <>
          {!isDelivered && (
            <TouchableOpacity 
              className="flex-row items-center gap-3 p-4 bg-fill-weaker rounded-xl mb-3 active:bg-fill-weak"
              onPress={onEdit}
            >
              <Edit2 size={20} color="rgba(23,11,0,0.8)" />
              <Text className="text-base text-text-strong font-medium" style={{ fontFamily: FONTS.sansMedium }}>Edit capsule</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            className="flex-row items-center gap-3 p-4 bg-fill-weaker rounded-xl mb-3 active:bg-fill-weak"
            onPress={onView}
          >
            <Eye size={20} color="rgba(23,11,0,0.8)" />
            <Text className="text-base text-text-strong font-medium" style={{ fontFamily: FONTS.sansMedium }}>View capsule</Text>
          </TouchableOpacity>

          {capsule.status === 'scheduled' && (
            <TouchableOpacity 
              className="flex-row items-center gap-3 p-4 bg-fill-weaker rounded-xl mb-3 active:bg-fill-weak"
              onPress={onPause}
              disabled={isUpdating}
            >
              <Pause size={20} color="rgba(23,11,0,0.8)" />
              <Text className="text-base text-text-strong font-medium" style={{ fontFamily: FONTS.sansMedium }}>Pause delivery</Text>
            </TouchableOpacity>
          )}

          {capsule.status === 'pause' && (
            <TouchableOpacity 
              className="flex-row items-center gap-3 p-4 bg-fill-weaker rounded-xl mb-3 active:bg-fill-weak"
              onPress={onResume}
              disabled={isUpdating}
            >
              <Play size={20} color="rgba(23,11,0,0.8)" />
              <Text className="text-base text-text-strong font-medium" style={{ fontFamily: FONTS.sansMedium }}>Resume delivery</Text>
            </TouchableOpacity>
          )}

          {!isDelivered && (
            <>
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
                  <Text className="text-base font-medium" style={{ fontFamily: FONTS.sansMedium, color: COLORS.error }}>Delete capsule</Text>
                  <Text className="text-xs text-text-weak mt-0.5" style={{ fontFamily: FONTS.sans }}>Permanently remove this time capsule</Text>
                </View>
              </TouchableOpacity>
            </>
          )}
        </>
      )}
    </View>
  );
}
