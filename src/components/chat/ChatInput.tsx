import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Platform, StyleSheet,
  Keyboard, ScrollView, Image, ActivityIndicator,
} from 'react-native';
import { ArrowUp, Mic, Square, Phone, Paperclip, X, FileText, Image as ImageIcon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS, FONTS } from '@/constants/tokens';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  FadeInDown,
} from 'react-native-reanimated';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVoiceToText } from '@/hooks/use-voice-to-text';
import { useFileUpload } from '@/hooks/mutations/use-file-upload';
import { useToast } from '@/components/ui/Toast';
import type { IFile } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttachmentItem {
  clientId: string;
  fileId: string | null;   // null while uploading
  uri: string;
  name: string;
  mimeType: string;
  isUploading: boolean;
  file?: IFile;
}

export interface ChatSendPayload {
  text: string;
  /** IDs of already-uploaded files to pass to the AI as context */
  attachmentIds: string[];
}

interface ChatInputProps {
  onSend: (payload: ChatSendPayload) => void;
  /** Opens the voice call overlay (separate from voice-to-text dictation) */
  onVoice?: () => void;
  onStop?: () => void;
  disabled?: boolean;
  placeholder?: string;
  loading?: boolean;
}

const MAX_FILE_MB = 15;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

const SUPPORTED_MIME = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
  'video/mp4', 'video/quicktime',
  'audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/*',
  'application/pdf',
  'text/plain',
];

// ─── Component ────────────────────────────────────────────────────────────────

export function ChatInput({
  onSend,
  onVoice,
  onStop,
  disabled,
  placeholder = 'Share a thought...',
  loading,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [multiline, setMultiline] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  const btnScale = useSharedValue(1);
  const micPulse = useSharedValue(1);
  const insets = useSafeAreaInsets();
  const { toast } = useToast();

  const textBeforeDictationRef = useRef('');

  const { mutateAsync: uploadFile } = useFileUpload();

  // ─── Voice-to-text ──────────────────────────────────────────────────────

  const handlePartial = useCallback((liveText: string) => {
    const prefix = textBeforeDictationRef.current;
    const combined = prefix ? `${prefix} ${liveText}` : liveText;
    setText(combined);
    setMultiline(combined.includes('\n') || combined.length > 80);
  }, []);

  const handleTranscript = useCallback((finalText: string) => {
    const prefix = textBeforeDictationRef.current;
    const combined = prefix ? `${prefix} ${finalText}` : finalText;
    setText(combined);
    setMultiline(combined.includes('\n') || combined.length > 80);
    textBeforeDictationRef.current = '';
  }, []);

  const {
    isRecording,
    isUnavailable: micUnavailable,
    duration,
    start: startRecording,
    stop: stopRecording,
    cancel: cancelRecording,
  } = useVoiceToText({
    onPartial: handlePartial,
    onTranscript: handleTranscript,
  });

  // ─── Mic pulse animation ─────────────────────────────────────────────────

  useEffect(() => {
    if (isRecording) {
      micPulse.value = withRepeat(
        withSequence(withTiming(1.3, { duration: 500 }), withTiming(1, { duration: 500 })),
        -1,
        true,
      );
    } else {
      micPulse.value = withSpring(1);
    }
  }, [isRecording, micPulse]);

  const micPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micPulse.value }],
  }));

  // ─── Keyboard visibility ──────────────────────────────────────────────────

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false),
    );
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // ─── File upload helper ───────────────────────────────────────────────────

  const uploadAndAdd = useCallback(async (uri: string, mimeType: string, name: string, fileSize?: number) => {
    if (fileSize && fileSize > MAX_FILE_BYTES) {
      toast(`Files must be under ${MAX_FILE_MB}MB`, 'error');
      return;
    }
    const clientId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setAttachments(prev => [...prev, { clientId, fileId: null, uri, name, mimeType, isUploading: true }]);
    try {
      const result = await uploadFile({ uri, type: mimeType, name });
      if (result?._id) {
        setAttachments(prev => prev.map(a =>
          a.clientId === clientId ? { ...a, fileId: result._id, isUploading: false, file: result } : a
        ));
      } else {
        setAttachments(prev => prev.filter(a => a.clientId !== clientId));
      }
    } catch {
      setAttachments(prev => prev.filter(a => a.clientId !== clientId));
    }
  }, [uploadFile]);

  // ─── Attachment pickers ───────────────────────────────────────────────────

  // Gallery picker — photos + videos via ImagePicker (reliable on iOS & Android)
  const handlePickGallery = useCallback(async () => {
    Haptics.selectionAsync();
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        toast('Allow Memento to access your photos and videos.', 'error');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        quality: 0.85,
      });
      if (!result.canceled) {
        for (const asset of result.assets) {
          const isVideo = asset.mimeType?.startsWith('video/');
          const mime = asset.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg');
          const name = asset.fileName || `${isVideo ? 'video' : 'photo'}_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;
          await uploadAndAdd(asset.uri, mime, name, asset.fileSize);
        }
      }
    } catch { /* user cancelled */ }
  }, [uploadAndAdd, toast]);

  // Document picker — audio, PDF, text, other files
  const handlePickDocument = useCallback(async () => {
    Haptics.selectionAsync();
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/*',
          'application/pdf',
          'text/plain',
        ],
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (!result.canceled && result.assets.length > 0) {
        for (const asset of result.assets) {
          if (asset.size && asset.size > MAX_FILE_BYTES) {
            toast(`"${asset.name}" exceeds the ${MAX_FILE_MB}MB limit.`, 'error');
            continue;
          }
          await uploadAndAdd(asset.uri, asset.mimeType || 'application/octet-stream', asset.name, asset.size);
        }
      }
    } catch { /* user cancelled */ }
  }, [uploadAndAdd, toast]);

  const removeAttachment = useCallback((clientId: string) => {
    Haptics.selectionAsync();
    setAttachments(prev => prev.filter(a => a.clientId !== clientId));
  }, []);

  // ─── Send ─────────────────────────────────────────────────────────────────

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    const readyIds = attachments.filter(a => a.fileId && !a.isUploading).map(a => a.fileId as string);
    if ((!trimmed && readyIds.length === 0) || disabled) return;
    // Block if any upload is still in progress
    if (attachments.some(a => a.isUploading)) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSend({ text: trimmed, attachmentIds: readyIds });
    setText('');
    setMultiline(false);
    setAttachments([]);
    textBeforeDictationRef.current = '';
  }, [text, attachments, disabled, onSend]);

  const handleMicPress = useCallback(async () => {
    if (disabled) return;
    if (isRecording) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      stopRecording();
    } else {
      textBeforeDictationRef.current = text.trim();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await startRecording();
    }
  }, [disabled, isRecording, text, stopRecording, startRecording]);

  const handleStop = useCallback(() => {
    if (!onStop) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onStop();
  }, [onStop]);

  const btnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  // ─── Derived ──────────────────────────────────────────────────────────────

  const anyUploading = attachments.some(a => a.isUploading);
  const hasContent = text.trim().length > 0 || attachments.filter(a => a.fileId).length > 0;
  const showStop = loading;
  const showSend = !loading && hasContent && !isRecording && !anyUploading;
  const showMic = !loading && !showSend;

  const bottomPadding = keyboardVisible
    ? verticalScale(8)
    : insets.bottom
    ? insets.bottom + verticalScale(8)
    : verticalScale(16);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      className="px-4 py-2.5 bg-transparent"
      style={{ paddingBottom: bottomPadding }}
    >
      {/* Attachment preview strip */}
      {attachments.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 8 }}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
        >
          {attachments.map(a => (
            <View key={a.clientId} style={styles.attachChip}>
              {a.mimeType.startsWith('image/') ? (
                <Image source={{ uri: a.uri }} style={styles.attachThumb} resizeMode="cover" />
              ) : (
                <View style={styles.attachIcon}>
                  <FileText size={14} color={COLORS.brand} strokeWidth={1.8} />
                </View>
              )}
              <Text style={styles.attachName} numberOfLines={1}>{a.name}</Text>
              {a.isUploading
                ? <ActivityIndicator size="small" color={COLORS.brand} style={{ marginLeft: 4 }} />
                : (
                  <TouchableOpacity onPress={() => removeAttachment(a.clientId)} hitSlop={6}>
                    <X size={12} color={COLORS.textWeak} strokeWidth={2.5} />
                  </TouchableOpacity>
                )
              }
            </View>
          ))}
        </ScrollView>
      )}

      <View
        className="flex-row items-center gap-2 bg-white/90 border border-stroke-weaker rounded-[24px] px-3.5 py-1 shadow-md shadow-black/5"
        style={styles.floatingContainer}
      >
        {/* Text input */}
        <View
          className="flex-1 justify-center py-1"
          style={{
            minHeight: multiline ? verticalScale(32) : undefined,
            maxHeight: multiline ? verticalScale(96) : undefined,
            height: multiline ? undefined : verticalScale(32),
          }}
        >
          <TextInput
            value={text}
            onChangeText={(v) => {
              if (isRecording) textBeforeDictationRef.current = v;
              setText(v);
              setMultiline(v.includes('\n') || v.length > 80);
            }}
            placeholder={isRecording ? 'Listening…' : placeholder}
            placeholderTextColor={isRecording ? COLORS.brand : COLORS.textMuted}
            multiline
            className="text-text-strong"
            style={{ fontFamily: FONTS.sans, paddingVertical: 0, textAlignVertical: 'center', fontSize: moderateScale(13) }}
            blurOnSubmit={false}
            editable={!disabled}
          />
          {isRecording && !text.trim() && (
            <View className="flex-row items-center gap-1.5 mt-0.5">
              <View className="size-1.5 rounded-full bg-error" />
              <Text style={{ fontFamily: FONTS.sansMedium, fontSize: moderateScale(11), color: COLORS.error }}>
                {formatDuration(duration)} · tap mic to finish
              </Text>
            </View>
          )}
        </View>

        {/* Right-side controls */}
        <View className="flex-row items-center gap-1.5">
          {/* Gallery picker — photos + videos */}
          {!isRecording && !showStop && (
            <TouchableOpacity
              onPress={handlePickGallery}
              disabled={disabled || anyUploading}
              className="rounded-full bg-fill-weaker border border-stroke-weaker items-center justify-center"
              style={{ width: scale(28), height: scale(28), borderRadius: scale(14), opacity: disabled || anyUploading ? 0.4 : 1 }}
            >
              <ImageIcon size={scale(12)} color={COLORS.textWeak} strokeWidth={2} />
            </TouchableOpacity>
          )}

          {/* Document picker — audio, PDF, text */}
          {!isRecording && !showStop && (
            <TouchableOpacity
              onPress={handlePickDocument}
              disabled={disabled || anyUploading}
              className="rounded-full bg-fill-weaker border border-stroke-weaker items-center justify-center"
              style={{ width: scale(28), height: scale(28), borderRadius: scale(14), opacity: disabled || anyUploading ? 0.4 : 1 }}
            >
              <Paperclip size={scale(12)} color={COLORS.textWeak} strokeWidth={2} />
            </TouchableOpacity>
          )}

          {/* Voice call button */}
          {onVoice && !isRecording && !showStop && (
            <TouchableOpacity
              onPress={() => { Haptics.selectionAsync(); onVoice(); }}
              disabled={disabled}
              className="rounded-full bg-fill-weaker border border-stroke-weaker items-center justify-center"
              style={{ width: scale(28), height: scale(28), borderRadius: scale(14) }}
            >
              <Phone size={scale(12)} color={COLORS.textWeak} strokeWidth={2} />
            </TouchableOpacity>
          )}

          {/* Primary action button */}
          <Animated.View style={[btnAnimStyle]}>
            {showStop && (
              <TouchableOpacity
                onPress={handleStop}
                onPressIn={() => { btnScale.value = withSpring(0.85); }}
                onPressOut={() => { btnScale.value = withSpring(1); }}
                className="rounded-full bg-brand items-center justify-center shadow-md shadow-brand/10"
                style={{ width: scale(32), height: scale(32), borderRadius: scale(16) }}
              >
                <Square size={scale(11)} color={COLORS.textInverse} fill={COLORS.textInverse} />
              </TouchableOpacity>
            )}

            {showSend && (
              <TouchableOpacity
                onPress={handleSend}
                onPressIn={() => { btnScale.value = withSpring(0.85); }}
                onPressOut={() => { btnScale.value = withSpring(1); }}
                disabled={disabled}
                className="rounded-full bg-brand items-center justify-center shadow-md shadow-brand/15"
                style={{ width: scale(32), height: scale(32), borderRadius: scale(16) }}
              >
                <ArrowUp size={scale(15)} color={COLORS.textInverse} strokeWidth={3} />
              </TouchableOpacity>
            )}

            {showMic && (
              <Animated.View style={micPulseStyle}>
                <TouchableOpacity
                  onPress={handleMicPress}
                  disabled={disabled || micUnavailable}
                  className="rounded-full items-center justify-center"
                  style={{
                    width: scale(32),
                    height: scale(32),
                    borderRadius: scale(16),
                    backgroundColor: isRecording ? `${COLORS.error}15` : COLORS.fillWeaker,
                    borderWidth: 1,
                    borderColor: isRecording ? `${COLORS.error}30` : COLORS.strokeWeaker,
                    opacity: micUnavailable ? 0.35 : 1,
                  }}
                >
                  <Mic
                    size={scale(15)}
                    color={isRecording ? COLORS.error : micUnavailable ? COLORS.textMuted : COLORS.brand}
                    strokeWidth={2}
                  />
                </TouchableOpacity>
              </Animated.View>
            )}
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    ...Platform.select({
      ios: { backgroundColor: 'rgba(255, 255, 255, 0.85)' },
    }),
  },

  // Attachment chip
  attachChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.fillWeak,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
    paddingHorizontal: 8,
    paddingVertical: 5,
    maxWidth: 180,
  },
  attachThumb: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  attachIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: `${COLORS.brand}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachName: {
    flex: 1,
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: COLORS.textStrong,
  },
});
