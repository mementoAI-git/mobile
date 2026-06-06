import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Pencil, Eye, Pause, Play, RotateCcw, Trash2 } from 'lucide-react-native';
import { useDeleteCapsule, useUpdateCapsule } from '@/hooks/mutations/use-capsule-mutations';
import { ICapsule } from '@/types';
import { useUiStore } from '@/store';
import { COLORS, FONTS } from '@/constants/tokens';
import * as Haptics from 'expo-haptics';

interface CapsuleActionsSheetProps {
  capsule: ICapsule;
  onClose?: () => void;
}

export function CapsuleActionsSheet({ capsule, onClose }: CapsuleActionsSheetProps) {
  const openSheet = useUiStore((s) => s.openSheet);
  const { mutate: deleteCapsule, isPending: isDeleting } = useDeleteCapsule();
  const { mutate: updateCapsule, isPending: isUpdating } = useUpdateCapsule(capsule._id ?? '');

  const isDeleted = capsule.status === 'deleted';
  const isDelivered = capsule.status === 'delivered';

  const handleAction = (action: () => void) => {
    Haptics.selectionAsync();
    action();
    onClose?.();
  };

  const onEdit = () => {
    onClose?.();
    setTimeout(() => openSheet('create-capsule', { editData: capsule }), 300);
  };

  const onView = () => {
    onClose?.();
    setTimeout(() => openSheet('capsule-detail', { capsule, previewOnly: true }), 300);
  };

  const onPause = () => { updateCapsule({ status: 'pause' }); onClose?.(); };
  const onResume = () => { updateCapsule({ status: 'scheduled' }); onClose?.(); };
  const onRestore = () => { updateCapsule({ status: 'draft' }); onClose?.(); };
  const onDelete = () => { deleteCapsule(capsule._id ?? ''); onClose?.(); };

  // Unified row style — same as ChatActionsSheet pattern
  const ActionRow = ({
    icon,
    iconBg,
    iconColor,
    label,
    description,
    onPress,
    disabled,
    danger,
  }: {
    icon: React.ReactNode;
    iconBg: string;
    iconColor?: string;
    label: string;
    description?: string;
    onPress: () => void;
    disabled?: boolean;
    danger?: boolean;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      className="flex-row items-center gap-4 p-4 rounded-[20px] bg-white border border-stroke-weaker"
      style={danger ? { borderColor: `${COLORS.error}20` } : undefined}
    >
      <View
        className="size-10 rounded-xl items-center justify-center"
        style={{ backgroundColor: iconBg }}
      >
        {icon}
      </View>
      <View className="flex-1">
        <Text
          style={{
            fontFamily: FONTS.sansMedium,
            fontSize: 14,
            color: danger ? COLORS.error : COLORS.textStrong,
          }}
        >
          {label}
        </Text>
        {description && (
          <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: COLORS.textWeak, marginTop: 1 }}>
            {description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="gap-2">
      {isDeleted ? (
        <ActionRow
          icon={<RotateCcw size={18} color={COLORS.brand} strokeWidth={1.5} />}
          iconBg={COLORS.brandSubtle}
          label="Restore capsule"
          description="Move back to drafts"
          onPress={() => handleAction(onRestore)}
          disabled={isUpdating}
        />
      ) : (
        <>
          {!isDelivered && (
            <ActionRow
              icon={<Pencil size={18} color={COLORS.textBase} strokeWidth={1.5} />}
              iconBg={COLORS.fillWeak}
              label="Edit capsule"
              description="Update content, recipients or schedule"
              onPress={onEdit}
            />
          )}

          <ActionRow
            icon={<Eye size={18} color={COLORS.textBase} strokeWidth={1.5} />}
            iconBg={COLORS.fillWeak}
            label="View capsule"
            description="Preview the full letter"
            onPress={onView}
          />

          {capsule.status === 'scheduled' && (
            <ActionRow
              icon={<Pause size={18} color={COLORS.warning} strokeWidth={1.5} />}
              iconBg={`${COLORS.warning}15`}
              label="Pause delivery"
              description="Hold until you resume"
              onPress={() => handleAction(onPause)}
              disabled={isUpdating}
            />
          )}

          {capsule.status === 'pause' && (
            <ActionRow
              icon={<Play size={18} color={COLORS.success} strokeWidth={1.5} />}
              iconBg={`${COLORS.success}15`}
              label="Resume delivery"
              description="Continue to scheduled date"
              onPress={() => handleAction(onResume)}
              disabled={isUpdating}
            />
          )}

          {!isDelivered && (
            <ActionRow
              icon={<Trash2 size={18} color={COLORS.error} strokeWidth={1.5} />}
              iconBg={`${COLORS.error}10`}
              label="Delete capsule"
              description="Permanently remove this time capsule"
              onPress={() => handleAction(onDelete)}
              disabled={isDeleting}
              danger
            />
          )}
        </>
      )}
    </View>
  );
}
