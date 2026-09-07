import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Button, TextInput, Spinner, LinkPreviews } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { Image as ImageIcon, FolderOpen, X, Lock, Globe, Users } from 'lucide-react-native';
import { useCreateMemory, useUpdateMemory } from '@/hooks/mutations/use-memory-mutations';
import { useFileUpload } from '@/hooks/use-file-upload';
import { COLORS, FONTS } from '@/constants/tokens';
import { BottomSheetTextInput, BottomSheetScrollView, BottomSheetModal } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SelectFromMediaModal } from './SelectFromMediaModal';
import * as Haptics from 'expo-haptics';
import { useUiStore } from '@/store';
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
  const handleRemove = useCallback(() => onRemove(tag), [tag, onRemove]);
  return (
    <View className="flex-row items-center bg-white border border-stroke-weaker rounded-full pl-3 pr-1 py-1 h-8 gap-1 shadow-sm">
      <Text className="text-sm text-text-strong" style={{ fontFamily: FONTS.sansMedium }}>#{tag}</Text>
      <TouchableOpacity onPress={handleRemove} className="p-1">
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
            setTimeout(() => { openSheet('share-memory', { id: newId }); }, 300);
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
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 8,
          paddingBottom: insets.bottom ? insets.bottom + 24 : 48,
          gap: 24
        }}
      >
        {/* ── Header ── */}
        <View className="flex-row items-center justify-between">
          <Text className="text-[28px] text-text-strong" style={{ fontFamily: FONTS.serif }}>
            {editData ? 'Edit Memory' : 'New Memory'}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={6} className="size-8 rounded-full bg-fill-weaker items-center justify-center">
            <X size={18} color={COLORS.textWeak} />
          </TouchableOpacity>
        </View>

        <View className="gap-5">
          {/* Title */}
          <View className="gap-2">
            <Text className="text-sm font-bold text-text-muted uppercase tracking-widest ml-1" style={{ fontFamily: FONTS.sansBold }}>
              Title
            </Text>
            <BottomSheetTextInput
              value={title}
              onChangeText={setTitle}
              placeholder="What's this memory about?"
              placeholderTextColor={COLORS.textMuted}
              className="h-14 bg-fill-weaker border border-stroke-weaker rounded-2xl px-4 text-base text-text-strong"
              style={{ fontFamily: FONTS.sansMedium }}
            />
          </View>

          {/* Body */}
          <View className="gap-2">
            <Text className="text-sm font-bold text-text-muted uppercase tracking-widest ml-1" style={{ fontFamily: FONTS.sansBold }}>
              The Story
            </Text>
            <BottomSheetTextInput
              value={body}
              onChangeText={setBody}
              placeholder="Write about your cherished moment"
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={6}
              className="min-h-[160px] bg-fill-weaker border border-stroke-weaker rounded-2xl px-4 py-4 text-base text-text-strong"
              style={{ fontFamily: FONTS.sans, textAlignVertical: 'top' }}
            />
            <LinkPreviews text={body} />
          </View>

          {/* Tags */}
          <View className="gap-2">
            <Text className="text-sm font-bold text-text-muted uppercase tracking-widest ml-1" style={{ fontFamily: FONTS.sansBold }}>
              Tags
            </Text>
            <View className="bg-fill-weaker border border-stroke-weaker rounded-2xl px-2 py-2 min-h-14 flex-row flex-wrap items-center gap-2">
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
                className="flex-1 min-w-[100px] text-sm text-text-strong h-8 px-2"
                style={{ fontFamily: FONTS.sans }}
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
                  <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 13, color: attachments.length > 0 ? COLORS.brand : COLORS.textStrong }}>
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
              <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 13, color: COLORS.textStrong }}>
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
              style={{ fontFamily: FONTS.sansMedium, fontSize: 13, color: privacyIsActive ? COLORS.brand : COLORS.textStrong }}
              numberOfLines={1}
            >
              {privacyLabel}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Footer ── */}
        <View className="mt-4 gap-4">
          <Button
            onPress={handleSave}
            loading={isCreating || isUpdatingMemory}
            disabled={!title.trim() || isUploading || isCreating || isUpdatingMemory}
            size="lg"
            className="h-14 bg-brand rounded-full"
          >
            <Text className="text-white font-bold" style={{ fontFamily: FONTS.sansBold }}>
              {editData ? 'Save Changes' : 'Save Memory'}
            </Text>
          </Button>
        </View>

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
