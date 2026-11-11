import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { useState, useMemo, useCallback } from 'react';
import { View, Text } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { Button, TextInput, Spinner, LinkPreviews } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import ImageIcon from 'lucide-react-native/icons/image';
import FolderOpen from 'lucide-react-native/icons/folder-open';
import X from 'lucide-react-native/icons/x';
import Lock from 'lucide-react-native/icons/lock';
import Globe from 'lucide-react-native/icons/globe';
import Users from 'lucide-react-native/icons/users';
import { useCreateMemory, useUpdateMemory } from '@/hooks/mutations/use-memory-mutations';
import { useMemoriesStats } from '@/hooks/queries/use-overview';
import { useFileUpload } from '@/hooks/use-file-upload';

import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { BottomSheetTextInput, BottomSheetScrollView, BottomSheetModal } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SelectFromMediaModal } from './SelectFromMediaModal';
import * as Haptics from 'expo-haptics';
import { SheetHeader } from './SheetHeader';
import { SHEET_GROUP_GAP, SHEET_SECTION_GAP, getSheetActionsBottomPadding } from '@/features/layout/sheet-safe-area';
import { useUiStore, useUserStore } from '@/store';
import { celebrateFirstStory, isFirstStory } from '@/features/ceremony/first-story';
import type { IMemory } from '@/types';
import { PublishPrivacySheet, type PrivacyMode } from './PublishPrivacySheet';
import {
  buildMemoryAudiencePayload,
  deriveMemoryAudience,
  formatMemoryAudienceLabel,
  type MemoryAudienceSelection,
} from '@/features/memories/memory-audience';

const MemoTagPillItem = React.memo(function MemoTagPillItem({
  tag,
  onRemove,
}: {
  tag: string;
  onRemove: (t: string) => void;
}) {
  const COLORS = useThemeColors();
  const handleRemove = useCallback(() => onRemove(tag), [tag, onRemove]);
  return (
    <View className="flex-row items-center bg-card border border-stroke-weaker rounded-full pl-3 pr-1 py-1 h-8 gap-1 shadow-sm">
      <Text className="text-text-strong" style={TYPE.label}>#{tag}</Text>
      <TouchableOpacity onPress={handleRemove} className="p-1" hitSlop={12}>
        <X size={14} color={COLORS.textWeak} />
      </TouchableOpacity>
    </View>
  );
});

// ─── Main sheet ───────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  editData?: IMemory;
}

export function CreateMemorySheet({ onClose, editData }: Props) {
  const COLORS = useThemeColors();
  const openSheet = useUiStore((s) => s.openSheet);
  const insets = useSafeAreaInsets();
  const { toast } = useToast();

  const [title, setTitle] = useState(editData?.title || '');
  const [body, setBody] = useState(editData?.body || '');
  const initialStatus = editData?.status === 'saved' ? 'save' : (editData?.status || 'save');
  const [status, setStatus] = useState<string>(initialStatus);
  const [attachments, setAttachments] = useState<string[]>(editData?.attachments?.map(a => a._id) || []);
  const [tags, setTags] = useState<string[]>(editData?.tags || []);
  const [tagInput, setTagInput] = useState('');

  // ── Privacy state ────────────────────────────────────────────────────────────
  const [audience, setAudience] = useState<MemoryAudienceSelection>(() => deriveMemoryAudience(editData ?? {}));
  const mediaModalRef = React.useRef<BottomSheetModal>(null);
  const privacyModalRef = React.useRef<BottomSheetModal>(null);

  const { mutate: createMemory, isPending: isCreating } = useCreateMemory();
  const { mutate: updateMemory, isPending: isUpdatingMemory } = useUpdateMemory(editData?._id || '');
  const { pickAndUpload, isUploading } = useFileUpload();
  const { data: memoriesStats } = useMemoriesStats();

  // ── Privacy button label ──────────────────────────────────────────────────────
  const privacyLabel = useMemo(() => formatMemoryAudienceLabel(audience), [audience]);

  const PrivacyIcon = audience.mode === 'private' ? Lock : audience.mode === 'everyone' ? Globe : Users;
  const privacyIsActive = audience.mode !== 'private';

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handlePickFile = useCallback(async () => {
    Haptics.selectionAsync();
    const uploadedFile = await pickAndUpload();
    if (uploadedFile?._id) {
      setAttachments(prev => [...prev, uploadedFile._id]);
    }
  }, [pickAndUpload]);

  const handleTagSubmit = useCallback(() => {
    const parts = tagInput.split(/[\s,]+/).map(p => p.trim().toLowerCase()).filter(Boolean);
    if (parts.length > 0) {
      setTags(prev => {
        const next = [...prev];
        for (const p of parts) {
          if (!next.includes(p)) next.push(p);
        }
        return next;
      });
    }
    setTagInput('');
  }, [tagInput]);

  const handleTagInputChange = useCallback((text: string) => {
    if (text.includes(' ') || text.includes(',')) {
      const parts = text.split(/[\s,]+/).map(p => p.trim().toLowerCase()).filter(Boolean);
      if (parts.length > 0) {
        setTags(prev => {
          const next = [...prev];
          for (const p of parts) {
            if (!next.includes(p)) next.push(p);
          }
          return next;
        });
      }
      setTagInput('');
    } else {
      setTagInput(text);
    }
  }, []);

  const removeTag = useCallback((t: string) => setTags(prev => prev.filter(tag => tag !== t)), []);

  const handleToggleBeneficiary = useCallback((id: string) => {
    setAudience((current) => ({
      ...current,
      beneficiaryIds: current.beneficiaryIds.includes(id)
        ? current.beneficiaryIds.filter((value) => value !== id)
        : [...current.beneficiaryIds, id],
    }));
  }, []);

  const handleToggleGroup = useCallback((id: string) => {
    setAudience((current) => ({
      ...current,
      groupIds: current.groupIds.includes(id)
        ? current.groupIds.filter((value) => value !== id)
        : [...current.groupIds, id],
    }));
  }, []);

  const handleOpenMediaModal = useCallback(() => {
    mediaModalRef.current?.present();
  }, []);

  const handleOpenPrivacyModal = useCallback(() => {
    Haptics.selectionAsync();
    privacyModalRef.current?.present();
  }, []);


  const handleSave = useCallback(() => {
    if (!title.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const finalStatus = status === 'saved' ? 'save' : status;

    const payload = {
      title: title.trim(),
      body: body.trim(),
      status: finalStatus,
      attachments,
      tags,
      ...buildMemoryAudiencePayload(audience),
    };

    const mutationOptions = {
      onSuccess: (res: any) => {
        onClose();
        if (!editData && finalStatus === 'save') {
          const newId = res?.data?._id || res?._id || res?.data?.data?._id;
          if (newId) {
            if (isFirstStory(memoriesStats?.stories_count)) {
              void celebrateFirstStory({ memoryId: newId, title: title.trim(), email: useUserStore.getState().user?.email, delayMs: 300 });
            } else {
              setTimeout(() => openSheet('share-memory', { id: newId }), 300);
            }
          }
        }
      },
      onError: (err: any) => {
        const detailedErrors = err?.errors ? `\n\nDetails: ${JSON.stringify(err.errors)}` : '';
        toast(`${err?.message || 'Could not save'}${detailedErrors}`, 'error');
      }
    };

    if (editData) {
      updateMemory(payload, mutationOptions);
    } else {
      createMemory(payload, mutationOptions);
    }
  }, [title, status, body, attachments, tags, audience, onClose, editData, updateMemory, createMemory, openSheet, toast]);


  return (
    <>
      <SheetHeader
        title={editData ? 'Edit memory' : 'New memory'}
        onClose={onClose}
        closeLabel="Close memory"
        style={{ paddingHorizontal: 20 }}
      />
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: SHEET_GROUP_GAP,
          paddingBottom: getSheetActionsBottomPadding(insets.bottom),
          gap: SHEET_GROUP_GAP,
        }}
      >
        <View style={{ gap: SHEET_SECTION_GAP }}>
          {/* Title */}
          <View className="gap-2">
            <Text className="text-text-strong" style={TYPE.label}>
              Title
            </Text>
            <BottomSheetTextInput
              value={title}
              onChangeText={setTitle}
              placeholder="What's this memory about?"
              placeholderTextColor={COLORS.textMuted}
              className="h-14 bg-fill-weaker border border-stroke-weaker rounded-lg px-4 text-text-strong"
              style={TYPE.input}
            />
          </View>

          {/* Body */}
          <View className="gap-2">
            <Text className="text-text-strong" style={TYPE.label}>
              The Story
            </Text>
            <BottomSheetTextInput
              value={body}
              onChangeText={setBody}
              placeholder="Write about your cherished moment"
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={6}
              className="min-h-[160px] bg-fill-weaker border border-stroke-weaker rounded-lg px-4 py-4 text-text-strong"
              style={[TYPE.body, {textAlignVertical: 'top'}]}
            />
            <LinkPreviews text={body} />
          </View>

          {/* Tags */}
          <View className="gap-2">
            <Text className="text-text-strong" style={TYPE.label}>
              Tags
            </Text>
            <View className="bg-fill-weaker border border-stroke-weaker rounded-lg px-2 py-2 min-h-14 flex-row flex-wrap items-center gap-2">
              {tags.map((tag) => (
                <MemoTagPillItem key={tag} tag={tag} onRemove={removeTag} />
              ))}
              <BottomSheetTextInput
                value={tagInput}
                onChangeText={handleTagInputChange}
                onSubmitEditing={handleTagSubmit}
                blurOnSubmit={false}
                placeholder={tags.length === 0 ? "Add tags (press enter or space)" : "Add more"}
                placeholderTextColor={COLORS.textMuted}
                className="flex-1 min-w-[100px] text-text-strong h-8 px-2"
                style={TYPE.label}
              />
            </View>
          </View>

          {/* Media buttons */}
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={handlePickFile}
              disabled={isUploading}
              activeOpacity={0.8}
              className={`flex-1 flex-row items-center justify-center gap-2 h-12 rounded-full border ${attachments.length > 0 ? 'bg-brand/5 border-brand' : 'bg-fill-weaker border-stroke-weaker'}`}
            >
              {isUploading ? (
                <Spinner size="small" />
              ) : (
                <>
                  <ImageIcon size={16} color={attachments.length > 0 ? COLORS.brand : COLORS.textBase} strokeWidth={1.5} />
                  <Text style={{ ...TYPE.bodySmall, color: attachments.length > 0 ? COLORS.brand : COLORS.textStrong }}>
                    {attachments.length > 0 ? `${attachments.length} file${attachments.length > 1 ? 's' : ''}` : 'Add media'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleOpenMediaModal}
              activeOpacity={0.8}
              className="flex-1 flex-row items-center justify-center gap-2 h-12 rounded-full border bg-fill-weaker border-stroke-weaker"
            >
              <FolderOpen size={16} color={COLORS.textBase} strokeWidth={1.5} />
              <Text style={{ ...TYPE.bodySmall, color: COLORS.textStrong }}>
                Library
              </Text>
            </TouchableOpacity>
          </View>

          {/* Privacy / Sharing button */}
          <TouchableOpacity
            onPress={handleOpenPrivacyModal}
            activeOpacity={0.8}
            className={`flex-row items-center justify-center gap-2 h-12 rounded-full border ${privacyIsActive ? 'bg-brand/5 border-brand' : 'bg-fill-weaker border-stroke-weaker'}`}
          >
            <PrivacyIcon
              size={16}
              color={privacyIsActive ? COLORS.brand : COLORS.textBase}
              strokeWidth={1.5}
            />
            <Text
              style={{ ...TYPE.bodySmall, color: privacyIsActive ? COLORS.brand : COLORS.textStrong }}
              numberOfLines={1}
            >
              {privacyLabel}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Actions ── */}
        <Button
          onPress={handleSave}
          loading={isCreating || isUpdatingMemory}
          disabled={!title.trim() || isUploading || isCreating || isUpdatingMemory}
          size="lg"
          rounded="full"
          className="h-14"
        >
          {editData ? 'Save Changes' : 'Save Memory'}
        </Button>

        <SelectFromMediaModal
          ref={mediaModalRef}
          selectedIds={attachments}
          onConfirm={setAttachments}
        />
      </BottomSheetScrollView>

      <PublishPrivacySheet
        ref={privacyModalRef}
        onClose={() => privacyModalRef.current?.dismiss()}
        mode={audience.mode === 'everyone' ? 'all' : audience.mode}
        onModeChange={(mode: PrivacyMode) => setAudience((current) => ({ ...current, mode: mode === 'all' ? 'everyone' : mode }))}
        selectedBeneficiaryIds={audience.beneficiaryIds}
        onToggleBeneficiary={handleToggleBeneficiary}
        selectedGroupIds={audience.groupIds}
        onToggleGroup={handleToggleGroup}
        onApply={(mode, beneficiaryIds, groupIds) => {
          setAudience({ mode: mode === 'all' ? 'everyone' : mode, beneficiaryIds, groupIds });
          privacyModalRef.current?.dismiss();
        }}
      />
    </>
  );
}
