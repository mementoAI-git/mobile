import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Platform,
  Keyboard,
} from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { BottomSheetTextInput, BottomSheetScrollView, BottomSheetModal } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSheetBottomPadding, SHEET_GROUP_GAP, SHEET_SECTION_GAP } from '@/features/layout/sheet-safe-area';
import { SheetHeader } from './SheetHeader';
import { useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import X from 'lucide-react-native/icons/x';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ImageIcon from 'lucide-react-native/icons/image';
import Plus from 'lucide-react-native/icons/plus';
import Check from 'lucide-react-native/icons/check';
import { Button, Spinner, Skeleton } from '@/components/ui';
import { useBeneficiaries } from '@/hooks/queries/use-beneficiaries';
import { useCreateCapsule, useUpdateCapsule } from '@/hooks/mutations/use-capsule-mutations';

import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { StylePicker } from '@/components/capsule/StylePicker';
import dayjs from 'dayjs';
import { useFiles } from '@/hooks/queries/use-files';
import { useFileUpload } from '@/hooks/use-file-upload';
import type { IBeneficiary, ICapsule } from '@/types';
import { getThemeById } from '@/constants/themes';
import { useUiStore } from '@/store';
import { PreviewCapsuleModal } from './PreviewCapsuleModal';
import { SelectFromMemoryModal } from './SelectFromMemoryModal';
import { SelectFromMediaModal } from './SelectFromMediaModal';
import { useUserStore } from '@/store';
import { useToast } from '../ui/Toast';
import { resolveCapsuleRecipientInputs } from '@/features/capsules/capsule-contract';
import { SignedAttachmentImage } from '@/components/ui/SignedAttachmentImage';
import { useCapsuleThemeFonts } from '@/hooks/use-capsule-theme-fonts';
import { useSheetChrome } from '@/components/sheets/use-sheet-chrome';

interface Props {
  onClose: () => void;
  editData?: ICapsule & { _id?: string };
}

export function CreateCapsuleSheet({ onClose, editData }: Props) {
  useCapsuleThemeFonts();
  const isEdit = !!editData?._id;
  const sheetChrome = useSheetChrome();
  const insets = useSafeAreaInsets();

  // ── Form state ──────────────────────────────────────────────────────────────
  const [title, setTitle] = useState(editData?.title ?? '');
  const [body, setBody] = useState(editData?.body ?? '');

  const [recipientIds, setRecipientIds] = useState<string[]>(
    (editData?.recipients ?? []).map((r) => (r as any).email ?? (r as any)._id ?? (r as any)),
  );
  const [recipientInput, setRecipientInput] = useState('');

  const [attachments, setAttachments] = useState<string[]>(
    editData?.attachments?.map((f) => (typeof f === 'string' ? f : f._id)) ?? [],
  );
  const [memories, setMemories] = useState<string[]>(
    editData?.memories?.map((m) => (typeof m === 'string' ? m : m._id)) ?? [],
  );

  const previewModalRef = useRef<BottomSheetModal>(null);
  const dateModalRef = useRef<BottomSheetModal>(null);
  const memoryModalRef = useRef<BottomSheetModal>(null);
  const mediaModalRef = useRef<BottomSheetModal>(null);
  const { toast } = useToast();

  const [scheduleDate, setScheduleDate] = useState<Date | null>(
    editData?.schedule_date ? new Date(editData.schedule_date) : null,
  );
  const [showNativePicker, setShowNativePicker] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Style state
  const [themeId, setThemeId] = useState(editData?.style?.themeId ?? 'blush');
  const [bgColor, setBgColor] = useState(editData?.style?.backgroundColor ?? '#FFE5D9');
  const [fontSize, setFontSize] = useState(editData?.style?.fontSize ?? '2x');

  const { data: beneficiariesData, isLoading: loadingBeneficiaries } = useBeneficiaries();

  const beneficiaries = useMemo(() => {
    if (Array.isArray(beneficiariesData)) return beneficiariesData;
    if ((beneficiariesData as any)?.docs) return (beneficiariesData as any).docs;
    return [];
  }, [beneficiariesData]);

  const user = useUserStore((s) => s.user);
  const senderName = user ? `${user.first_name} ${user.last_name}`.trim() || user.email : 'You';

  const recipientNames = useMemo(() => {
    return recipientIds
      .map(id => {
        const b = beneficiaries.find((b: any) => b._id === id || b.email === id);
        return b ? b.name : id;
      })
      .filter(Boolean)
      .join(', ');
  }, [recipientIds, beneficiaries]);

  const { mutate: createCapsule, isPending: creating } = useCreateCapsule();
  const { mutate: updateCapsule, isPending: updating } = useUpdateCapsule(editData?._id ?? '');
  const isPending = creating || updating;

  const { pickAndUpload, isUploading } = useFileUpload();

  const { data: recentMedia, isLoading: loadingMedia } = useFiles<any>({ limit: 10 });


  const toggleRecipient = useCallback((id: string, email?: string) => {
    setRecipientIds((prev) =>
      prev.includes(id) || (email ? prev.includes(email) : false)
        ? prev.filter((recipient) => recipient !== id && recipient !== email)
        : [...prev, id],
    );
  }, []);

  const handleRecipientInputSubmit = () => {
    const email = recipientInput.trim().toLowerCase();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (!recipientIds.includes(email)) {
        setRecipientIds(prev => [...prev, email]);
      }
      setRecipientInput('');
    } else if (email) {
      toast('Please enter a valid email address.', 'error');
    }
  };

  const toggleAttachment = useCallback((id: string) => {
    setAttachments((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  }, []);

  const handleBrowseFiles = async () => {
    const uploadedFile = await pickAndUpload();
    if (uploadedFile?._id) {
      setAttachments(prev => [...prev, uploadedFile._id]);
    }
  };

  const handleSubmit = (submitStatus: 'draft' | 'scheduled') => {
    if (!title.trim()) {
      toast('Please add a title before saving.', 'error');
      return;
    }
    if (submitStatus === 'scheduled' && !scheduleDate) {
      toast('Pick a delivery date to schedule your capsule.', 'error');
      return;
    }

    const payload = {
      title: title.trim(),
      body: body.trim(),
      recipients: resolveCapsuleRecipientInputs(recipientIds, beneficiaries),
      status: submitStatus,
      schedule_date: scheduleDate ? scheduleDate.toISOString() : undefined,
      attachments,
      memories,
      style: {
        themeId,
        backgroundColor: bgColor,
        fontSize,
      },
    };

    if (isEdit) {
      updateCapsule(payload, {
        onSuccess: () => {
          toast('Capsule updated.', 'success');
          onClose();
        }
      });
    } else {
      createCapsule(payload, {
        onSuccess: () => {
          onClose();
          const recipientNames = recipientIds.map((id) => {
            const match = (beneficiariesData ?? []).find((b: any) => b._id === id || b.email === id);
            return match?.name || match?.email || id;
          });
          setTimeout(() => {
            useUiStore.getState().openSheet('capsule-sealed', {
              title: title.trim() || 'Untitled Capsule',
              unlockDate: scheduleDate ? scheduleDate.toISOString() : undefined,
              recipientNames,
              themeId,
            });
          }, 350);
        }
      });
    }
  };

  const selectedTheme = getThemeById(themeId);
  const Background = selectedTheme.Background;

  return (
    <>
      <SheetHeader
        title={isEdit ? 'Edit capsule' : 'Create capsule'}
        onClose={onClose}
        closeLabel="Close capsule"
        style={{ paddingHorizontal: 20 }}
      />

      <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: SHEET_GROUP_GAP, paddingBottom: (insets.bottom ? insets.bottom + 24 : 40) + keyboardHeight, gap: SHEET_SECTION_GAP }}>

        {/* Recipients */}
        <View className="gap-3">
          <Text className="text-text-strong" style={TYPE.label}>
            Select recipient(s)
          </Text>

          <View className="border border-stroke-weaker rounded-xl p-2 min-h-[44px] flex-row flex-wrap gap-2 items-center bg-card">
            {recipientIds.map(id => {
              const b = beneficiaries.find((x: any) => x._id === id);
              const displayName = b ? b.name : id;
              return (
                <View key={id} className="bg-fill-weaker border border-stroke-weaker rounded-full px-3 py-1.5 flex-row items-center gap-1.5">
                  <Text className="text-text-strong" style={TYPE.metadata}>{displayName}</Text>
                  <TouchableOpacity onPress={() => toggleRecipient(id)} hitSlop={12}>
                    <X size={12} color={COLORS.textWeak} />
                  </TouchableOpacity>
                </View>
              );
            })}
            <BottomSheetTextInput
              value={recipientInput}
              onChangeText={setRecipientInput}
              onSubmitEditing={handleRecipientInputSubmit}
              placeholder="Enter email address"
              placeholderTextColor={COLORS.textDisabled}
              style={{ flex: 1, minWidth: 120, ...TYPE.label, color: COLORS.textStrong, padding: 0 }}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="done"
            />
          </View>

          <View className="bg-fill-weaker rounded-2xl p-4 mt-1">
            <Text className="text-text-weak mb-3" style={TYPE.metadata}>Recent</Text>
            {loadingBeneficiaries ? (
              <View className="flex-row items-center gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <View key={i} className="items-center w-16 gap-2">
                    <Skeleton className="size-12 rounded-full" />
                    <Skeleton className="h-3 w-10 rounded-full" />
                  </View>
                ))}
              </View>
            ) : beneficiaries.length === 0 ? (
              <Text className="text-text-weak" style={TYPE.label}>No beneficiaries added yet.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {beneficiaries.map((b: any) => {
                  const selected = recipientIds.includes(b._id ?? '')
                    || recipientIds.includes(b.email ?? '');
                  return (
                    <TouchableOpacity
                      key={b._id}
                      onPress={() => toggleRecipient(b._id, b.email)}
                      className="items-center w-16 gap-2"
                    >
                      <View className={`size-12 rounded-full items-center justify-center border-2 ${selected ? 'border-brand bg-brand' : 'border-transparent bg-card shadow-sm'}`}>
                        <Text className={selected ? 'text-white' : 'text-text-strong'} style={TYPE.label}>
                          {b.name[0]?.toUpperCase()}
                        </Text>
                      </View>
                      <View className="items-center">
                        <Text className="text-text-strong text-center" numberOfLines={1} style={TYPE.metadata}>{b.name}</Text>
                        <Text className="text-text-weak text-center capitalize" numberOfLines={1} style={TYPE.eyebrow}>{b.relationship}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>

        {/* Upload Media */}
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-text-strong" style={TYPE.label}>
              Upload media
            </Text>
            <TouchableOpacity onPress={() => memoryModalRef.current?.present()}>
              <Text className="text-brand" style={TYPE.label}>Add from memory</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleBrowseFiles}
            disabled={isUploading}
            className="border-2 border-dashed border-stroke-weaker rounded-2xl py-8 px-4 items-center justify-center gap-2"
          >
            {isUploading ? (
              <Spinner />
            ) : (
              <>
                <Text className="text-text-strong text-center" style={TYPE.label}>
                  Drag and drop your file{'\n'}here or tap to upload
                </Text>
                <Text className="text-text-weak text-center mb-2" style={TYPE.metadata}>
                  Supports JPG, PNG, MP4, MP3, PDF,{'\n'}DOC, TXT. Max file size: 120mb
                </Text>
                <Button variant="outline" onPress={handleBrowseFiles} className="rounded-full bg-card border-stroke-weak pointer-events-none">
                  <Text className="text-text-strong" style={TYPE.label}>Browse files</Text>
                </Button>
              </>
            )}
          </TouchableOpacity>

          <View className="bg-fill-weaker rounded-2xl p-4 mt-1">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-text-weak" style={TYPE.metadata}>Recent</Text>
              <TouchableOpacity onPress={() => mediaModalRef.current?.present()}>
                <Text className="text-brand" style={TYPE.metadata}>See all</Text>
              </TouchableOpacity>
            </View>
            {loadingMedia ? (
              <View className="flex-row items-center gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="size-16 rounded-xl" />
                ))}
              </View>
            ) : !recentMedia?.length ? (
              <Text className="text-text-weak" style={TYPE.label}>No recent media found.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {recentMedia.map((media: any) => {
                  const mediaId = media._id || media.id;
                  const isSelected = attachments.includes(mediaId);
                  return (
                    <TouchableOpacity
                      key={mediaId}
                      onPress={() => toggleAttachment(mediaId)}
                      className={`size-16 bg-fill-weaker rounded-xl border-2 ${isSelected ? 'border-brand' : 'border-transparent'} shadow-sm overflow-hidden items-center justify-center relative`}
                    >
                      {(media.type === 'image' || media.type === 'video') && (media.url || media.thumbnail) ? (
                        <SignedAttachmentImage
                          attachment={media}
                          preferThumbnail
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text className={`uppercase ${isSelected ? 'text-brand' : 'text-text-weak'}`} style={TYPE.eyebrow}>{media.type}</Text>
                      )}
                      {isSelected && (
                        <View className="absolute top-1 right-1 bg-brand rounded-full p-0.5 shadow-sm">
                          <Check size={10} color="white" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity onPress={() => mediaModalRef.current?.present()} className="size-16 border-2 border-dashed border-stroke-weak rounded-xl items-center justify-center bg-white/50">
                  <Plus size={24} strokeWidth={1.5} color={COLORS.textWeak} />
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>

        {/* Write a message */}
        <View className="gap-3">
          <Text className="text-text-strong" style={TYPE.label}>
            Write a message
          </Text>
          <View className="bg-fill-weaker border border-stroke-weaker rounded-xl px-4 py-3">
            <BottomSheetTextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Header here"
              placeholderTextColor={COLORS.textMuted}
              className="text-text-strong p-0 m-0"
              style={TYPE.input}
            />
          </View>
          <View className="bg-fill-weaker border border-stroke-weaker rounded-xl px-4 py-3 min-h-[140px]">
            <BottomSheetTextInput
              value={body}
              onChangeText={setBody}
              placeholder="Happy birthday, Katrina. I hope you're having a great day. Decided to send this video to remind you of how much I cherish you..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              textAlignVertical="top"
              className="flex-1 text-text-strong p-0 m-0 leading-relaxed"
              style={[TYPE.body, {minHeight: 120}]}
            />
          </View>
        </View>

        {/* Capsule delivery date */}
        <View className="gap-3">
          <Text className="text-text-strong" style={TYPE.label}>
            Capsule delivery date:
          </Text>
          <TouchableOpacity
            onPress={() => dateModalRef.current?.present()}
            className="flex-row items-center justify-between p-4 bg-card border border-stroke-weaker rounded-xl"
          >
            <Text className="text-text-strong" style={TYPE.label}>
              {scheduleDate
                ? `${dayjs(scheduleDate).format('MM/DD/YYYY')} (In ${Math.abs(dayjs(scheduleDate).diff(dayjs(), 'year'))} Years)`
                : 'Select delivery date'}
            </Text>
            <ChevronDown size={16} color={COLORS.textWeak} />
          </TouchableOpacity>
          {showNativePicker && (
            <DateTimePicker
              value={scheduleDate ?? new Date()}
              mode="date"
              minimumDate={new Date()}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_e, date) => {
                setShowNativePicker(Platform.OS === 'ios');
                if (date) { setScheduleDate(date); }
              }}
            />
          )}
        </View>

        {/* Preview */}
        <View className="gap-3">
          <Text className="text-text-strong" style={TYPE.label}>
            Preview
          </Text>

          <View className="w-full mb-2">
            <StylePicker
              currentThemeId={themeId}
              fontSize={fontSize}
              onThemeSelect={(t) => {
                setThemeId(t.id);
                setBgColor(t.color);
              }}
              onSizeSelect={setFontSize}
            />
          </View>

          <View className="bg-fill-weaker p-4 rounded-3xl border border-stroke-weaker items-center">
            {/* The Capsule mock card inside preview area */}
            <View className="w-full aspect-[560/697] rounded-2xl overflow-hidden relative border border-stroke-weak shadow-sm" style={{ backgroundColor: selectedTheme.color }}>
              <Background width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />

              <View className="absolute inset-0 p-6 pt-10">
                {/* To / From Header */}
                <View className="flex-row items-center justify-between mb-8 opacity-80">
                  {/* typography-exception: capsule-theme-preview */}
                  <Text style={[TYPE.eyebrow, /* typography-exception: capsule-theme-preview */ {fontFamily: selectedTheme.fonts.body, color: selectedTheme.textColor}]} numberOfLines={1}>
                    To: {recipientNames || 'Someone special'}
                  </Text>
                  {/* Decorative middle icon */}
                  <View className="size-3 rounded-full border items-center justify-center mx-2 shrink-0" style={{ borderColor: selectedTheme.headerColor }}>
                    <View className="size-1 rounded-full" style={{ backgroundColor: selectedTheme.headerColor }} />
                  </View>
                  {/* typography-exception: capsule-theme-preview */}
                  <Text style={[TYPE.eyebrow, /* typography-exception: capsule-theme-preview */ {fontFamily: selectedTheme.fonts.body, color: selectedTheme.textColor}]} numberOfLines={1}>
                    From: {senderName}
                  </Text>
                </View>

                <Text
                  className="text-center mb-4 uppercase tracking-widest"
                  style={[TYPE.sectionTitle, /* typography-exception: capsule-theme-preview */ {fontFamily: selectedTheme.fonts.header,
                    color: selectedTheme.headerColor}]}>
                  {title || 'Your Title'}
                </Text>
                <Text
                  className="text-center opacity-80 leading-relaxed"
                  style={[TYPE.label, {
                    /* typography-exception: capsule-theme-preview */
                    fontFamily: selectedTheme.fonts.body,
                    color: selectedTheme.textColor,
                  }]}
                  numberOfLines={6}
                >
                  {body || 'Your message preview'}
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => previewModalRef.current?.present()}
                className="absolute inset-0 bg-black/40 items-center justify-center"
              >
                <View className="bg-black/60 rounded-full px-5 py-2.5 flex-row items-center gap-2">
                  <Text className="text-white" style={TYPE.label}>Tap to preview</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Actions: 32px below the body (8px here + the 24px section gap). */}
        <View className="flex-row gap-3 pt-2">
          <Button
            variant="outline"
            size="lg"
            rounded="full"
            className="h-14 flex-1"
            onPress={() => handleSubmit('draft')}
            disabled={isPending}
          >
            Save as Draft
          </Button>
          <Button
            size="lg"
            rounded="full"
            className="h-14 flex-1"
            onPress={() => handleSubmit('scheduled')}
            loading={isPending}
            disabled={isPending || !scheduleDate || !title.trim() || !body.trim() || recipientIds.length === 0}
          >
            {isEdit ? 'Update Capsule' : 'Schedule Capsule'}
          </Button>
        </View>

      </BottomSheetScrollView>

      <PreviewCapsuleModal
        ref={previewModalRef}
        title={title}
        body={body}
        themeId={themeId}
        setThemeId={setThemeId}
        bgColor={bgColor}
        setBgColor={setBgColor}
        fontSize={fontSize}
        setFontSize={setFontSize}
        recipientIds={recipientIds}
        beneficiaries={beneficiaries}
      />

      {/* Date Options Modal */}
      <BottomSheetModal
        ref={dateModalRef}
        {...sheetChrome.props}
        snapPoints={sheetChrome.snapPoints(['50%'])}
      >
        <SheetHeader
          title="Delivery date"
          onClose={() => dateModalRef.current?.dismiss()}
          closeLabel="Close delivery date"
          style={{ paddingHorizontal: 20 }}
        />
        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: SHEET_GROUP_GAP, paddingBottom: getSheetBottomPadding(insets.bottom, 20), gap: 12 }}>
          {[
            { label: 'In 3 days', days: 3 },
            { label: 'In 1 week', days: 7 },
            { label: 'In 1 month', days: 30 },
            { label: 'In 6 months', days: 180 },
            { label: 'In 1 year', days: 365 },
          ].map((preset) => (
            <TouchableOpacity
              key={preset.label}
              onPress={() => {
                setScheduleDate(dayjs().add(preset.days, 'day').toDate());
                dateModalRef.current?.dismiss();
              }}
              className="p-4 rounded-xl border border-stroke-weaker bg-card"
            >
              <Text className="text-text-strong" style={TYPE.body}>{preset.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => {
              dateModalRef.current?.dismiss();
              setTimeout(() => setShowNativePicker(true), 300);
            }}
            className="p-4 rounded-xl border border-stroke-weaker bg-card mt-3"
          >
            <Text className="text-brand text-center" style={TYPE.body}>Pick Custom Date...</Text>
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheetModal>

      <SelectFromMemoryModal
        ref={memoryModalRef}
        selectedIds={memories}
        onConfirm={setMemories}
      />

      <SelectFromMediaModal
        ref={mediaModalRef}
        selectedIds={attachments}
        onConfirm={setAttachments}
      />
    </>
  );
}
