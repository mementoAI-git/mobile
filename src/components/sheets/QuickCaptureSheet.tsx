import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Keyboard, TextInput as RNTextInput, Platform } from 'react-native';
import { Mic, Send, Image as ImageIcon, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useQuickCapture } from '@/hooks/mutations/use-quick-capture';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useUiStore } from '@/store';
import { useFileUpload } from '@/hooks/mutations/use-file-upload';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, FONTS } from '@/constants/tokens';
import { RecordingIconButton } from '@/components/ui/RecordingIconButton';
import { RecordingStatus } from '@/components/ui/RecordingStatus';
import type { IDailyPromptCapture } from '@/types';

export function QuickCaptureSheet({ onClose }: { onClose?: () => void }) {
  const [text, setText] = useState<string>('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isPickingImage, setIsPickingImage] = useState<boolean>(false);

  // Cast to any: BottomSheetTextInput ref type doesn't perfectly overlap RNTextInput
  const inputRef = useRef<any>(null);
  // Guard state updates after the sheet has been closed/unmounted
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);
  const { isRecording, duration, start, stop } = useAudioRecorder();

  const closeSheet = useUiStore((s) => s.closeSheet);
  const sheetProps = useUiStore((s) => s.sheetProps);

  useEffect(() => {
    const eventName = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const sub = Keyboard.addListener(eventName, () => {
      if (!isRecording && !isPickingImage && text.trim() === '' && attachments.length === 0) {
        if (onClose) onClose();
      }
    });
    return () => sub.remove();
  }, [isRecording, isPickingImage, text, attachments, onClose]);
  const dailyPrompt = sheetProps?.daily_prompt as IDailyPromptCapture | undefined;
  const { mutate: quickCapture, isPending: isCreating } = useQuickCapture();
  const { mutateAsync: uploadFile, isPending: isUploading } = useFileUpload();

  const handleRecord = async () => {
    if (isRecording) {
      const uri = await stop();
      if (!isMountedRef.current) return;
      if (uri) {
        try {
          const uploaded = await uploadFile({
            uri,
            name: 'voice_note.m4a',
            type: 'audio/m4a',
          });
          if (isMountedRef.current && uploaded && uploaded._id) {
            setAttachments(prev => [...prev, uploaded._id]);
          }
        } catch (err) {
          if (isMountedRef.current) console.error('Upload failed', err);
        }
      }
    } else {
      await start();
    }
  };

  const handlePickImage = async () => {
    if (!isMountedRef.current) return;
    setIsPickingImage(true);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      try {
        const fileUri = asset.uri;
        const fileName = fileUri.split('/').pop() || 'upload.jpg';
        const fileType = asset.mimeType || 'image/jpeg';

        const uploaded = await uploadFile({
          uri: fileUri,
          name: fileName,
          type: fileType,
        });

        if (isMountedRef.current && uploaded && uploaded._id) {
          setAttachments(prev => [...prev, uploaded._id]);
        }
      } catch (err) {
        if (isMountedRef.current) console.error('Upload failed', err);
      }
    }
    if (isMountedRef.current) {
      setIsPickingImage(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleSave = () => {
    if (!text.trim() && attachments.length === 0) return;

    const payload: import('@/hooks/mutations/use-quick-capture').QuickCapturePayload = {
      body: text.trim(),
      attachments: attachments.length > 0 ? attachments : undefined,
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
        if (onClose) onClose();
        else closeSheet();
      },
    });
  };

  return (
    <View className="px-5 pb-8 pt-2">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-xl text-text-strong" style={{ fontFamily: FONTS.serif }}>
          {dailyPrompt ? "Today's Reflection" : 'Quick Capture'}
        </Text>
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); onClose ? onClose() : closeSheet(); }}
          className="size-8 rounded-full bg-fill-weaker items-center justify-center"
        >
          <X size={18} color={COLORS.textWeak} />
        </TouchableOpacity>
      </View>

      {/* Prompt question card — only shown when opened from a daily prompt */}
      {dailyPrompt?.pinned_text ? (
        <View
          className="bg-white rounded-[20px] border border-stroke-weaker px-4 py-4 mb-4 gap-2"
          style={{ shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}
        >
          <View
            className="self-start rounded-full px-2.5 py-0.5"
            style={{ backgroundColor: `${COLORS.brand}0D`, borderWidth: 1, borderColor: `${COLORS.brand}33` }}
          >
            <Text
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ fontFamily: FONTS.sansBold, color: COLORS.brand }}
            >
              Prompt
            </Text>
          </View>
          <Text
            className="text-[17px] text-text-strong leading-snug"
            style={{ fontFamily: FONTS.serif }}
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
          placeholder={dailyPrompt ? 'Your reflection...' : "What's on your mind? Type or speak..."}
          placeholderTextColor={COLORS.textWeak}
          multiline
          autoFocus
          className="flex-1 text-base text-text-strong p-0 m-0"
          style={{ fontFamily: FONTS.sans, textAlignVertical: 'top' }}
        />

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
              disabled={isUploading || isRecording}
              className={`p-2 rounded-full border shadow-sm flex-row items-center gap-1 ${attachments.length > 0 ? 'bg-brand-tint border-brand-weak' : 'bg-white border-stroke-weaker'} ${isRecording ? 'opacity-50' : ''}`}
            >
              <ImageIcon size={20} color={attachments.length > 0 ? COLORS.brand : COLORS.textBase} />
              {attachments.length > 0 && <Text className="text-brand text-xs font-medium ml-1">{attachments.length}</Text>}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={isCreating || isUploading || (!text.trim() && attachments.length === 0)}
            className={`p-3 rounded-full flex-row items-center justify-center ${(text.trim() || attachments.length > 0) && !isCreating && !isUploading ? 'bg-brand' : 'bg-fill-weak'
              }`}
          >
            {isCreating || isUploading ? (
              <ActivityIndicator size="small" color={COLORS.textInverse} />
            ) : (
              <Send size={18} color={(text.trim() || attachments.length > 0) ? COLORS.textInverse : COLORS.textMuted} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
