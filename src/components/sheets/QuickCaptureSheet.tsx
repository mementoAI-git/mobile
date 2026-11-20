import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, ActivityIndicator, Keyboard, TextInput as RNTextInput, Platform } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import Mic from 'lucide-react-native/icons/mic';
import Send from 'lucide-react-native/icons/send';
import ImageIcon from 'lucide-react-native/icons/image';
import { SheetHeader } from './SheetHeader';
import { SHEET_GROUP_GAP } from '@/features/layout/sheet-safe-area';
import { useQuickCapture } from '@/hooks/mutations/use-quick-capture';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useUiStore } from '@/store';
import { useFileUpload } from '@/hooks/mutations/use-file-upload';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';
import * as ImagePicker from 'expo-image-picker';
import { requestLibraryPickerAccess } from '@/features/media/library-picker-access';

import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { RecordingIconButton } from '@/components/ui/RecordingIconButton';
import { RecordingStatus } from '@/components/ui/RecordingStatus';
import { LinkPreviews } from '@/components/ui/LinkPreview';
import type { IDailyPromptCapture } from '@/types';
import { toast } from '@/components/ui/Toast';
import { isPermissionGranted, type PermissionLike } from '@/lib/permission-recovery';
import { showPermissionRecoveryAlert } from '@/lib/show-permission-recovery-alert';
import { getMediaUploadInput } from '@/features/media/attachments';
import {
  getUploadedAttachmentIds,
  hasUploadingAttachments,
} from '@/features/media/attachment-upload-state';
import { useAttachmentUploads } from '@/features/media/use-attachment-uploads';
import type { IFile } from '@/types';

export function QuickCaptureSheet({ onClose }: { onClose?: () => void }) {
  const COLORS = useThemeColors();
  const [text, setText] = useState<string>('');
  const [isPickingImage, setIsPickingImage] = useState<boolean>(false);

  // Cast to any: BottomSheetTextInput ref type doesn't perfectly overlap RNTextInput
  const inputRef = useRef<any>(null);
  // Guard state updates after the sheet has been closed/unmounted
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);
  const handleMicrophonePermissionDenied = useCallback((permission: PermissionLike) => {
    showPermissionRecoveryAlert({
      permission,
      title: 'Microphone is off',
      description: 'Allow microphone access to add a voice note to this quick capture.',
      settingsDescription: 'Microphone access is turned off in Settings. Turn it back on to add a voice note to this quick capture.',
    });
  }, []);

  const { isRecording, duration, start, stop } = useAudioRecorder({
    onPermissionDenied: handleMicrophonePermissionDenied,
  });

  const closeSheet = useUiStore((s) => s.closeSheet);
  const sheetProps = useUiStore((s) => s.sheetProps);
  const dailyPrompt = sheetProps?.daily_prompt as IDailyPromptCapture | undefined;
  const { mutate: quickCapture, isPending: isCreating } = useQuickCapture();
  const { mutateAsync: uploadFile } = useFileUpload();
  const {
    attachments,
    clearAttachments,
    uploadAndAdd,
  } = useAttachmentUploads<IFile>({
    uploadFile,
    insert: 'append',
    isMountedRef,
    onUploadFailure: () => {
      toast('We couldn’t upload the attachment. Please try again.', 'error');
    },
  });
  const uploadedAttachmentIds = useMemo(
    () => getUploadedAttachmentIds(attachments),
    [attachments],
  );
  const isUploadingAttachment = useMemo(
    () => hasUploadingAttachments(attachments),
    [attachments],
  );

  useEffect(() => {
    const eventName = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const sub = Keyboard.addListener(eventName, () => {
      if (!isRecording && !isPickingImage && text.trim() === '' && attachments.length === 0) {
        if (onClose) onClose();
      }
    });
    return () => sub.remove();
  }, [isRecording, isPickingImage, text, attachments, onClose]);

  const handleRecord = async () => {
    if (isRecording) {
      const uri = await stop();
      if (!isMountedRef.current) return;
      if (uri) {
        await uploadAndAdd(uri, 'audio/m4a', 'voice_note.m4a', {
          isVoice: true,
          duration,
        });
      }
    } else {
      await start();
    }
  };

  const handlePickImage = async () => {
    if (!isMountedRef.current) return;
    setIsPickingImage(true);
    let shouldFocusInput = true;
    try {
      const permission = await requestLibraryPickerAccess();
      if (!isPermissionGranted(permission)) {
        shouldFocusInput = false;
        if (isMountedRef.current) {
          showPermissionRecoveryAlert({
            permission,
            title: 'Photos are tucked away',
            description: 'Allow photo access to add an image to this quick capture.',
            settingsDescription: 'Photo access is turned off in Settings. Turn it back on to add an image to this quick capture.',
          });
        }
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = getMediaUploadInput(result.assets[0]);
        await uploadAndAdd(asset.uri, asset.mimeType, asset.name, {
          fileSize: asset.fileSize,
        });
      }
    } finally {
      if (isMountedRef.current) {
        setIsPickingImage(false);
        if (shouldFocusInput) {
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      }
    }
  };

  const handleSave = () => {
    if (isUploadingAttachment) return;
    if (!text.trim() && uploadedAttachmentIds.length === 0) return;

    const payload: import('@/hooks/mutations/use-quick-capture').QuickCapturePayload = {
      body: text.trim(),
      visibility: 'private',
      attachments: uploadedAttachmentIds.length > 0 ? uploadedAttachmentIds : undefined,
      // Wire up daily prompt context so the server can link enrichment to the prompt
      ...(dailyPrompt?.prompt_type === 'static' && dailyPrompt.prompt_id
        ? { prompt_type: 'static', prompt_id: dailyPrompt.prompt_id }
        : dailyPrompt?.pinned_text
        ? { prompt_type: 'ai-generated', prompt_text: dailyPrompt.pinned_text }
        : {}),
      ...(dailyPrompt?.reflection_day_key
        ? { reflection_day_key: dailyPrompt.reflection_day_key }
        : {}),
    };

    quickCapture(payload, {
      onSuccess: () => {
        clearAttachments();
        if (onClose) onClose();
        else closeSheet();
      },
    });
  };

  return (
    <View>
      <SheetHeader
        title={dailyPrompt ? "Today's reflection" : 'Quick capture'}
        onClose={() => (onClose ? onClose() : closeSheet())}
        closeLabel="Close quick capture"
        style={{ marginBottom: SHEET_GROUP_GAP }}
      />

      {/* Prompt question card — only shown when opened from a daily prompt */}
      {dailyPrompt?.pinned_text ? (
        <View
          className="bg-card rounded-[20px] border border-stroke-weaker px-4 py-4 mb-6 gap-2"
          style={{ shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}
        >
          <View
            className="self-start rounded-full px-2.5 py-0.5"
            style={{ backgroundColor: `${COLORS.brand}0D`, borderWidth: 1, borderColor: `${COLORS.brand}33` }}
          >
            <Text
              className="uppercase tracking-widest"
              style={{ ...TYPE.eyebrow, color: COLORS.brand }}
            >
              Prompt
            </Text>
          </View>
          <Text
            className="text-text-strong"
            style={TYPE.cardTitle}
          >
            {dailyPrompt.pinned_text}
          </Text>
        </View>
      ) : null}

      <View className="bg-fill-weaker border border-stroke-weaker rounded-2xl p-4 min-h-[160px]">
        <BottomSheetTextInput
          ref={inputRef}
          value={text}
          onChangeText={setText}
          placeholder={dailyPrompt ? 'Your reflection' : "What's on your mind? Type or speak"}
          placeholderTextColor={COLORS.textWeak}
          multiline
          autoFocus
          className="flex-1 text-text-strong p-0 m-0"
          style={{ ...TYPE.label, textAlignVertical: 'top' }}
        />

        <LinkPreviews text={text} style={{ marginTop: 8 }} />

        <View className="flex-row items-center justify-between mt-4">
          <View className="flex-row items-center gap-4">
            <RecordingIconButton
              onPress={handleRecord}
              active={isRecording}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: COLORS.card,
                borderWidth: 1,
                borderColor: COLORS.strokeWeak,
              }}
            >
              <Mic size={20} color={isRecording ? COLORS.textInverse : COLORS.brand} />
            </RecordingIconButton>
            {isRecording && <RecordingStatus seconds={duration} />}
            <TouchableOpacity
              onPress={handlePickImage}
              disabled={isUploadingAttachment || isPickingImage || isRecording}
              className={`p-2 rounded-full border shadow-sm flex-row items-center gap-1 ${attachments.length > 0 ? 'bg-brand-tint border-brand-weak' : 'bg-card border-stroke-weaker'} ${isRecording ? 'opacity-50' : ''}`}
            >
              <ImageIcon size={20} color={attachments.length > 0 ? COLORS.brand : COLORS.textBase} />
              {attachments.length > 0 && <Text className="text-brand ml-1" style={TYPE.metadata}>{attachments.length}</Text>}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={isCreating || isUploadingAttachment || (!text.trim() && uploadedAttachmentIds.length === 0)}
            className={`p-3 rounded-full flex-row items-center justify-center ${(text.trim() || uploadedAttachmentIds.length > 0) && !isCreating && !isUploadingAttachment ? 'bg-brand' : 'bg-fill-weak'
              }`}
          >
            {isCreating || isUploadingAttachment ? (
              <ActivityIndicator size="small" color={COLORS.textInverse} />
            ) : (
              <Send size={18} color={(text.trim() || uploadedAttachmentIds.length > 0) ? COLORS.textInverse : COLORS.textMuted} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
