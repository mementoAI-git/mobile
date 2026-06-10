import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, Platform } from 'react-native';
import { Button, TextInput, Spinner } from '@/components/ui';
import { Image as ImageIcon, FolderOpen, Users, Check, X, Shield, Lock, Paperclip } from 'lucide-react-native';
import { useCreateMemory, useUpdateMemory } from '@/hooks/mutations/use-memory-mutations';
import { useFileUpload } from '@/hooks/use-file-upload';
import { useBeneficiaries } from '@/hooks/queries/use-beneficiaries';
import { COLORS, FONTS } from '@/constants/tokens';
import { BottomSheetTextInput, BottomSheetScrollView, BottomSheetModal } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SelectFromMediaModal } from './SelectFromMediaModal';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useUiStore } from '@/store';
import type { IMemory } from '@/types';

interface Props {
  onClose: () => void;
  editData?: IMemory;
}

export function CreateMemorySheet({ onClose, editData }: Props) {
  const openSheet = useUiStore((s) => s.openSheet);
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState(editData?.title || '');
  const [body, setBody] = useState(editData?.body || '');
  const initialStatus = editData?.status === 'saved' ? 'save' : (editData?.status || 'save');
  const [status, setStatus] = useState<string>(initialStatus);
  const [attachments, setAttachments] = useState<string[]>(editData?.attachments?.map(a => a._id) || []);
  const [beneficiaries, setBeneficiaries] = useState<string[]>(editData?.beneficiaries?.map(b => b._id).filter((id): id is string => !!id) || []);
  const [showBeneficiaries, setShowBeneficiaries] = useState(false);
  const [tags, setTags] = useState<string[]>(editData?.tags || []);
  const [tagInput, setTagInput] = useState('');

  const mediaModalRef = React.useRef<BottomSheetModal>(null);

  const { data: beneficiariesData } = useBeneficiaries();
  const { mutate: createMemory, isPending: isCreating } = useCreateMemory();
  const { mutate: updateMemory, isPending: isUpdatingMemory } = useUpdateMemory(editData?._id || '');
  const { pickAndUpload, isUploading } = useFileUpload();

  const beneficiariesList = useMemo(() => {
    if (Array.isArray(beneficiariesData)) return beneficiariesData;
    if ((beneficiariesData as any)?.docs) return (beneficiariesData as any).docs;
    return [];
  }, [beneficiariesData]);

  const handlePickFile = async () => {
    Haptics.selectionAsync();
    const uploadedFile = await pickAndUpload();
    if (uploadedFile && uploadedFile.data?._id) {
      setAttachments(prev => [...prev, uploadedFile.data._id]);
    } else if (uploadedFile && uploadedFile._id) {
      setAttachments(prev => [...prev, uploadedFile._id]);
    }
  };

  const handleTagSubmit = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags(prev => [...prev, t]);
    }
    setTagInput('');
  };

  const handleTagInputChange = (text: string) => {
    // Spacebar (trailing space) auto-commits the current text as a tag
    if (text.endsWith(' ')) {
      const t = text.trim().toLowerCase();
      if (t && !tags.includes(t)) {
        setTags(prev => [...prev, t]);
      }
      setTagInput('');
    } else {
      setTagInput(text);
    }
  };

  const removeTag = (t: string) => {
    setTags(prev => prev.filter(tag => tag !== t));
  };

  const toggleBeneficiary = (id: string) => {
    Haptics.selectionAsync();
    setBeneficiaries(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);
  };

  const handleSave = () => {
    if (!title.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const finalStatus = status === 'saved' ? 'save' : status;
    const payload = { title: title.trim(), body: body.trim(), status: finalStatus, attachments, beneficiaries, tags };

    const mutationOptions = {
      onSuccess: (res: any) => {
        onClose();
        if (!editData && finalStatus === 'save') {
          // It's a new memory and it is saved (not a draft), trigger the share success modal
          const newId = res?.data?._id || res?._id || res?.data?.data?._id;
          if (newId) {
            setTimeout(() => {
              openSheet('share-memory', { id: newId });
            }, 300);
          }
        }
      },
      onError: (err: any) => {
        const detailedErrors = err?.errors ? `\n\nDetails: ${JSON.stringify(err.errors)}` : '';
        Alert.alert('Save Failed', `${err?.message || 'Could not save'}${detailedErrors}`);
      }
    };

    if (editData) {
      updateMemory(payload, mutationOptions);
    } else {
      createMemory(payload, mutationOptions);
    }
  };

  return (
    <BottomSheetScrollView 
      showsVerticalScrollIndicator={false} 
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: insets.bottom ? insets.bottom + 24 : 48,
        gap: 24
      }}
    >
      <View className="flex-row items-center justify-between">
        <Text
          className="text-[28px] text-text-strong"
          style={{ fontFamily: FONTS.serif }}
        >
          {editData ? 'Edit Memory' : 'New Memory'}
        </Text>
        <TouchableOpacity onPress={onClose} className="size-8 rounded-full bg-fill-weaker items-center justify-center">
          <X size={18} color={COLORS.textWeak} />
        </TouchableOpacity>
      </View>

      <View className="gap-5">
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

        <View className="gap-2">
          <Text className="text-sm font-bold text-text-muted uppercase tracking-widest ml-1" style={{ fontFamily: FONTS.sansBold }}>
            The Story
          </Text>
          <BottomSheetTextInput
            value={body}
            onChangeText={setBody}
            placeholder="Write about your cherished moment..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={6}
            className="min-h-[160px] bg-fill-weaker border border-stroke-weaker rounded-2xl px-4 py-4 text-base text-text-strong"
            style={{ fontFamily: FONTS.sans, textAlignVertical: 'top' }}
          />
        </View>

        <View className="gap-2">
          <Text className="text-sm font-bold text-text-muted uppercase tracking-widest ml-1" style={{ fontFamily: FONTS.sansBold }}>
            Tags
          </Text>
          <View className="bg-fill-weaker border border-stroke-weaker rounded-2xl px-2 py-2 min-h-14 flex-row flex-wrap items-center gap-2">
            {tags.map((tag) => (
              <View key={tag} className="flex-row items-center bg-white border border-stroke-weaker rounded-full pl-3 pr-1 py-1 h-8 gap-1 shadow-sm">
                <Text className="text-sm text-text-strong" style={{ fontFamily: FONTS.sansMedium }}>#{tag}</Text>
                <TouchableOpacity onPress={() => removeTag(tag)} className="p-1">
                  <X size={14} color={COLORS.textWeak} />
                </TouchableOpacity>
              </View>
            ))}
            <BottomSheetTextInput
              value={tagInput}
              onChangeText={handleTagInputChange}
              onSubmitEditing={handleTagSubmit}
              blurOnSubmit={false}
              placeholder={tags.length === 0 ? "Add tags (press enter or space)" : "Add more..."}
              placeholderTextColor={COLORS.textMuted}
              className="flex-1 min-w-[100px] text-sm text-text-strong h-8 px-2"
              style={{ fontFamily: FONTS.sans }}
            />
          </View>
        </View>

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
            onPress={() => mediaModalRef.current?.present()}
            activeOpacity={0.8}
            className="flex-1 flex-row items-center justify-center gap-2 h-12 rounded-full border bg-fill-weaker border-stroke-weaker"
          >
            <FolderOpen size={16} color={COLORS.textBase} strokeWidth={1.5} />
            <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 13, color: COLORS.textStrong }}>
              Library
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); setShowBeneficiaries(!showBeneficiaries); }}
          activeOpacity={0.8}
          className={`flex-row items-center justify-center gap-2 h-12 rounded-full border ${beneficiaries.length > 0 ? 'bg-brand/5 border-brand' : 'bg-fill-weaker border-stroke-weaker'}`}
        >
          <Users size={16} color={beneficiaries.length > 0 ? COLORS.brand : COLORS.textBase} strokeWidth={1.5} />
          <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 13, color: beneficiaries.length > 0 ? COLORS.brand : COLORS.textStrong }}>
            {beneficiaries.length > 0 ? `${beneficiaries.length} beneficiar${beneficiaries.length > 1 ? 'ies' : 'y'} added` : 'Add beneficiaries'}
          </Text>
        </TouchableOpacity>

        {showBeneficiaries && (
          <Animated.View entering={FadeInDown} className="bg-fill-weaker rounded-[24px] border border-stroke-weaker p-5">
            <Text className="text-[10px] text-text-muted font-bold uppercase tracking-[2px] mb-4" style={{ fontFamily: FONTS.sansBold }}>Select Beneficiaries</Text>
            {beneficiariesList.length > 0 ? (
              beneficiariesList.map((b: any) => (
                <TouchableOpacity
                  key={b._id}
                  onPress={() => b._id && toggleBeneficiary(b._id)}
                  className="flex-row items-center justify-between py-3 border-b border-stroke-weaker last:border-b-0"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="size-8 rounded-full bg-white items-center justify-center border border-stroke-weaker">
                      <Text className="text-xs">👤</Text>
                    </View>
                    <Text className="text-base text-text-strong" style={{ fontFamily: FONTS.sansMedium }}>{b.name || b.email}</Text>
                  </View>
                  {b._id && beneficiaries.includes(b._id) && (
                    <View className="size-6 bg-brand rounded-full items-center justify-center">
                      <Check size={14} color="white" strokeWidth={3} />
                    </View>
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <Text className="text-sm text-text-weak italic text-center py-2" style={{ fontFamily: FONTS.sans }}>No beneficiaries found</Text>
            )}
          </Animated.View>
        )}
      </View>

      <View className="mt-4 gap-4">
        <View className="flex-row items-center gap-2 px-2">
          <Lock size={12} color={COLORS.textWeak} />
          <Text className="text-[10px] text-text-weak leading-relaxed" style={{ fontFamily: FONTS.sans }}>
            Your memories are encrypted and private. They will only be shared with selected trustees after your passing or via time capsules.
          </Text>
        </View>
        
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
  );
}
