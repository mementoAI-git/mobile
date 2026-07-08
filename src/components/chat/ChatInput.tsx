import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, TextInput, TouchableOpacity, Platform, StyleSheet,
  Keyboard, ScrollView, Image, ActivityIndicator, AccessibilityInfo,
} from 'react-native';
import { ArrowUp, AudioLines, Mic, Square, PlusCircle, X, FileText, PhoneCall, Play } from 'lucide-react-native';
import { MediaPreviewModal, type PreviewAttachment } from '@/components/ui/MediaPreviewModal';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  ChatAttachmentPickerSheet,
  type ChatPickerAsset,
} from '@/components/chat/ChatAttachmentPickerSheet';
import { RecordingIconButton } from '@/components/ui/RecordingIconButton';
import { RecordingStatus } from '@/components/ui/RecordingStatus';
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
import { isPermissionGranted, type PermissionLike } from '@/lib/permission-recovery';
import { showPermissionRecoveryAlert } from '@/lib/show-permission-recovery-alert';
import {
  DOCUMENT_PICKER_MIME_TYPES,
  MAX_ATTACHMENT_FILE_MB,
  getDocumentUploadInput,
  getMediaUploadInput,
  isFileTooLarge,
} from '@/features/media/attachments';
import {
  getUploadedAttachments,
  hasUploadingAttachments,
  type UploadAttachment,
} from '@/features/media/attachment-upload-state';
import { useAttachmentUploads } from '@/features/media/use-attachment-uploads';
import type { IFile, IMessageAttachment } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type AttachmentItem = UploadAttachment<IFile>;

type ChatAttachmentPreview = IMessageAttachment;

export interface ChatSendPayload {
  text: string;
  /** IDs of already-uploaded files to pass to the AI as context */
  attachmentIds: string[];
  /** Uploaded file metadata used for the optimistic chat bubble preview */
  attachmentPreviews: ChatAttachmentPreview[];
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

const SUPPORTED_MIME = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
  'video/mp4', 'video/quicktime',
  'audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/*',
  'application/pdf',
  'text/plain',
];

const INPUT_PILL_RADIUS = 999;
const INPUT_PILL_INSET = scale(8);
const INPUT_PILL_GAP = scale(6);
const SECONDARY_ACTION_SIZE = scale(44);
const PRIMARY_ACTION_SIZE = scale(56);
const INPUT_PILL_VERTICAL_INSET = scale(6);
const INPUT_PILL_HEIGHT = PRIMARY_ACTION_SIZE + INPUT_PILL_VERTICAL_INSET * 2;

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
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  const btnScale = useSharedValue(1);
  const micPulse = useSharedValue(1);
  const insets = useSafeAreaInsets();
  const { toast } = useToast();

  const textBeforeDictationRef = useRef('');
  const attachmentPickerRef = useRef<BottomSheetModal>(null);

  const { mutateAsync: uploadFile } = useFileUpload();
  const {
    attachments,
    setAttachments,
    uploadAndAdd,
    removeAttachment: removeUploadedAttachment,
  } = useAttachmentUploads<IFile>({
    uploadFile,
    insert: 'append',
    onFileTooLarge: (maxFileMb) => {
      toast(`Files must be under ${maxFileMb}MB`, 'error');
    },
  });

  // ─── Voice-to-text ──────────────────────────────────────────────────────

  const handleVoiceError = useCallback((err: Error) => {
    const lower = err.message.toLowerCase();
    const message = lower.includes('permission')
      ? 'Allow microphone access to dictate in Memento.'
      : 'Voice dictation stopped. Try again.';
    toast(message, 'info');
  }, [toast]);

  const handleDictationPermissionDenied = useCallback((permission: PermissionLike) => {
    showPermissionRecoveryAlert({
      permission,
      title: 'Microphone is off',
      description: 'Allow microphone access to dictate your message.',
      settingsDescription: 'Microphone access is turned off in Settings. Turn it back on to dictate your message.',
    });
  }, []);

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
    onError: handleVoiceError,
    onPermissionDenied: handleDictationPermissionDenied,
  });

  // ─── Mic pulse animation ─────────────────────────────────────────────────

  useEffect(() => {
    if (isRecording && !reduceMotionEnabled) {
      micPulse.value = withRepeat(
        withSequence(withTiming(1.08, { duration: 650 }), withTiming(1, { duration: 650 })),
        -1,
        true,
      );
    } else {
      micPulse.value = withSpring(1);
    }
  }, [isRecording, micPulse, reduceMotionEnabled]);

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

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotionEnabled(enabled);
      })
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotionEnabled);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  // ─── Attachment pickers ───────────────────────────────────────────────────

  // Camera — launches device camera to capture photo or video
  const handleLaunchCamera = useCallback(async () => {
    Haptics.selectionAsync();
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!isPermissionGranted(permission)) {
        showPermissionRecoveryAlert({
          permission,
          title: 'Camera is tucked away',
          description: 'Allow camera access to capture a photo or video from the chat.',
          settingsDescription: 'Camera access is turned off in Settings. Turn it back on to capture a photo or video from the chat.',
        });
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.85,
      });
      if (!result.canceled && result.assets.length > 0) {
        const asset = getMediaUploadInput(result.assets[0]);
        await uploadAndAdd(asset.uri, asset.mimeType, asset.name, { fileSize: asset.fileSize });
      }
    } catch { /* user cancelled */ }
  }, [uploadAndAdd]);

  const handleAddPickerAssets = useCallback(async (pickedAssets: ChatPickerAsset[]) => {
    await Promise.all(pickedAssets.map(asset =>
      uploadAndAdd(asset.uploadUri, asset.mimeType, asset.name)
    ));
  }, [uploadAndAdd]);

  // Document picker — audio, PDF, text, other files
  const handlePickDocument = useCallback(async () => {
    Haptics.selectionAsync();
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: DOCUMENT_PICKER_MIME_TYPES,
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (!result.canceled && result.assets.length > 0) {
        // Filter out oversized files first, then upload remaining in parallel
        const validAssets = result.assets.filter(asset => {
          if (isFileTooLarge(asset.size)) {
            toast(`"${asset.name}" exceeds the ${MAX_ATTACHMENT_FILE_MB}MB limit.`, 'error');
            return false;
          }
          return true;
        });
        await Promise.all(validAssets.map((asset) => {
          const upload = getDocumentUploadInput(asset);
          return uploadAndAdd(upload.uri, upload.mimeType, upload.name, { fileSize: upload.fileSize });
        }));
      }
    } catch { /* user cancelled */ }
  }, [uploadAndAdd, toast]);

  const removeAttachment = useCallback((clientId: string) => {
    Haptics.selectionAsync();
    removeUploadedAttachment(clientId);
  }, [removeUploadedAttachment]);

  // ─── Send ─────────────────────────────────────────────────────────────────

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    const uploadedAttachments = getUploadedAttachments(attachments);
    const readyIds = uploadedAttachments.map(a => a.fileId);
    const readyAttachmentPreviews = uploadedAttachments
      .map((a): ChatAttachmentPreview => ({
        _id: a.fileId,
        url: a.file?.url ?? a.uri,
        name: a.file?.name ?? a.name,
        type: a.file?.type ?? a.mimeType,
        size: a.file?.size,
      }));
    if ((!trimmed && readyIds.length === 0) || disabled) return;
    // Block if any upload is still in progress
    if (hasUploadingAttachments(attachments)) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSend({ text: trimmed, attachmentIds: readyIds, attachmentPreviews: readyAttachmentPreviews });
    setText('');
    setMultiline(false);
    setAttachments([]);
    textBeforeDictationRef.current = '';
  }, [text, attachments, disabled, onSend, setAttachments]);

  const handleMicPress = useCallback(async () => {
    if (disabled) return;
    if (micUnavailable) {
      Haptics.selectionAsync();
      toast('Voice dictation is not available in this build.', 'info');
      return;
    }
    if (isRecording) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      stopRecording();
    } else {
      textBeforeDictationRef.current = text.trim();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await startRecording();
    }
  }, [disabled, isRecording, micUnavailable, text, stopRecording, startRecording, toast]);

  const handleCancelRecording = useCallback(() => {
    if (!isRecording) return;
    Haptics.selectionAsync();
    cancelRecording();
    const previousText = textBeforeDictationRef.current;
    setText(previousText);
    setMultiline(previousText.includes('\n') || previousText.length > 80);
    textBeforeDictationRef.current = '';
  }, [cancelRecording, isRecording]);

  const handleStop = useCallback(() => {
    if (!onStop) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onStop();
  }, [onStop]);

  const btnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  // ─── Derived ──────────────────────────────────────────────────────────────

  const attachmentState = useMemo(() => {
    const uploadedAttachments = getUploadedAttachments(attachments);
    const previewable: PreviewAttachment[] = [];

    for (const attachment of uploadedAttachments) {
      if (attachment.uri) {
        previewable.push({
          clientId: attachment.clientId,
          uri: attachment.uri,
          name: attachment.name,
          mimeType: attachment.mimeType,
        });
      }
    }

    return {
      anyUploading: hasUploadingAttachments(attachments),
      readyCount: uploadedAttachments.length,
      previewable,
    };
  }, [attachments]);
  const anyUploading = attachmentState.anyUploading;
  const hasAttachments = attachments.length > 0;
  const hasContent = text.trim().length > 0 || attachmentState.readyCount > 0;
  const showStop = loading;
  const showSend = !loading && hasContent && !isRecording && !anyUploading;
  const previewable = attachmentState.previewable;
  const bottomPadding = keyboardVisible
    ? verticalScale(8)
    : insets.bottom
    ? insets.bottom + verticalScale(8)
    : verticalScale(16);

  const handleOpenAttachmentPicker = useCallback(() => {
    if (disabled || anyUploading) return;
    Haptics.selectionAsync();
    attachmentPickerRef.current?.present();
  }, [anyUploading, disabled]);

  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      style={{ paddingBottom: bottomPadding, paddingHorizontal: 12, paddingTop: 6 }}
    >
      {/* Preview modal for selected media assets */}
      <MediaPreviewModal
        visible={previewVisible}
        attachments={previewable}
        initialIndex={previewIndex}
        onClose={() => setPreviewVisible(false)}
      />

      <View
        style={[
          styles.floatingContainer,
          hasAttachments ? styles.expandedComposer : styles.compactComposer,
        ]}
      >
        {hasAttachments ? (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.assetStrip}
              contentContainerStyle={styles.assetStripContent}
            >
              {attachments.map(a => {
                const isMedia = a.mimeType.startsWith('image/') || a.mimeType.startsWith('video/');
                const isVideo = a.mimeType.startsWith('video/');
                const isAudio = a.mimeType.startsWith('audio/');
                const previewIdx = previewable.findIndex(p => p.clientId === a.clientId);

                return (
                  <View key={a.clientId} style={styles.selectedAsset}>
                    <TouchableOpacity
                      onPress={() => {
                        if (!a.isUploading && previewIdx >= 0) {
                          Haptics.selectionAsync();
                          setPreviewIndex(previewIdx);
                          setPreviewVisible(true);
                        }
                      }}
                      activeOpacity={previewIdx >= 0 ? 0.84 : 1}
                      style={styles.assetPressable}
                    >
                      {isMedia ? (
                        <>
                          <Image source={{ uri: a.uri }} style={styles.assetThumb} resizeMode="cover" />
                          {isVideo && (
                            <View style={styles.videoAssetOverlay}>
                              <Play size={scale(18)} color={COLORS.textInverse} fill={COLORS.textInverse} strokeWidth={0} />
                            </View>
                          )}
                        </>
                      ) : isAudio ? (
                        <View style={styles.assetAudioTile}>
                          <AudioLines size={scale(23)} color={COLORS.brand} strokeWidth={2.3} />
                        </View>
                      ) : (
                        <View style={styles.assetFileTile}>
                          <FileText size={scale(22)} color={COLORS.brand} strokeWidth={2} />
                        </View>
                      )}
                      {a.isUploading && (
                        <View style={styles.assetUploadingOverlay}>
                          <ActivityIndicator color={COLORS.textInverse} />
                        </View>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => removeAttachment(a.clientId)}
                      activeOpacity={0.82}
                      hitSlop={6}
                      style={styles.assetRemoveButton}
                    >
                      <X size={scale(13)} color={COLORS.textInverse} strokeWidth={2.6} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>

            <TextInput
              value={text}
              onChangeText={(v) => {
                if (isRecording) textBeforeDictationRef.current = v;
                setText(v);
                setMultiline(v.includes('\n') || v.length > 60);
              }}
              placeholder={isRecording ? 'Listening…' : placeholder}
              placeholderTextColor={isRecording ? COLORS.brand : COLORS.textMuted}
              selectionColor={isRecording ? COLORS.brand : COLORS.textStrong}
              multiline
              style={[styles.expandedTextInput, isRecording && styles.recordingTextInput]}
              blurOnSubmit={false}
              editable={!disabled}
            />

            <View style={styles.expandedFooter}>
              {isRecording ? (
                <RecordingStatus seconds={duration} onCancel={handleCancelRecording} />
              ) : (
                <View />
              )}

              {showStop ? (
                <Animated.View style={btnAnimStyle}>
                  <TouchableOpacity
                    onPress={handleStop}
                    onPressIn={() => { btnScale.value = withSpring(0.9); }}
                    onPressOut={() => { btnScale.value = withSpring(1); }}
                    style={styles.expandedStopButton}
                  >
                    <Square size={scale(16)} color={COLORS.textInverse} fill={COLORS.textInverse} strokeWidth={0} />
                  </TouchableOpacity>
                </Animated.View>
              ) : (
                <Animated.View style={btnAnimStyle}>
                  <TouchableOpacity
                    onPress={handleSend}
                    onPressIn={() => { btnScale.value = withSpring(0.9); }}
                    onPressOut={() => { btnScale.value = withSpring(1); }}
                    disabled={disabled || !showSend}
                    style={[
                      styles.expandedSendButton,
                      (disabled || !showSend) && styles.expandedSendButtonDisabled,
                    ]}
                  >
                    {anyUploading ? (
                      <ActivityIndicator color={COLORS.textInverse} />
                    ) : (
                      <ArrowUp size={scale(25)} color={COLORS.textInverse} strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                </Animated.View>
              )}
            </View>
          </>
        ) : (
          <>
            <TouchableOpacity
              onPress={handleOpenAttachmentPicker}
              disabled={disabled || anyUploading}
              style={styles.plusButton}
            >
              <PlusCircle size={scale(50)} color={COLORS.textMuted} strokeWidth={1.9} />
            </TouchableOpacity>

            <View style={[styles.compactInputWrap, isRecording && styles.recordingInputWrap]}>
              <TextInput
                value={text}
                onChangeText={(v) => {
                  if (isRecording) textBeforeDictationRef.current = v;
                  setText(v);
                  setMultiline(v.includes('\n') || v.length > 60);
                }}
                placeholder={isRecording ? 'Listening…' : placeholder}
                placeholderTextColor={isRecording ? COLORS.brand : COLORS.textMuted}
                selectionColor={isRecording ? COLORS.brand : COLORS.textStrong}
                multiline
                style={[styles.compactTextInput, isRecording && styles.recordingTextInput]}
                blurOnSubmit={false}
                editable={!disabled}
              />
              {isRecording && (
                <RecordingStatus seconds={duration} compact onCancel={handleCancelRecording} />
              )}
            </View>

            {showStop ? (
              <Animated.View style={btnAnimStyle}>
                <TouchableOpacity
                  onPress={handleStop}
                  onPressIn={() => { btnScale.value = withSpring(0.9); }}
                  onPressOut={() => { btnScale.value = withSpring(1); }}
                  style={styles.compactStopButton}
                >
                  <Square size={scale(16)} color={COLORS.textInverse} fill={COLORS.textInverse} strokeWidth={0} />
                </TouchableOpacity>
              </Animated.View>
            ) : showSend ? (
              <Animated.View style={btnAnimStyle}>
                <TouchableOpacity
                  onPress={handleSend}
                  onPressIn={() => { btnScale.value = withSpring(0.9); }}
                  onPressOut={() => { btnScale.value = withSpring(1); }}
                  disabled={disabled}
                  style={styles.compactSendButton}
                >
                  <ArrowUp size={scale(22)} color={COLORS.textInverse} strokeWidth={2.5} />
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <View style={styles.compactActionRow}>
                <Animated.View style={micPulseStyle}>
                  <RecordingIconButton
                    onPress={handleMicPress}
                    active={isRecording}
                    disabled={disabled}
                    muted={micUnavailable}
                  >
                    <Mic size={scale(20)} color={isRecording ? COLORS.textInverse : COLORS.textBase} strokeWidth={2} />
                  </RecordingIconButton>
                </Animated.View>
                {onVoice && !isRecording && (
                  <TouchableOpacity
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onVoice(); }}
                    disabled={disabled}
                    style={[styles.callButton, disabled && styles.disabledButton]}
                  >
                    <PhoneCall size={scale(24)} color={COLORS.textInverse} strokeWidth={2} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}
      </View>

      <ChatAttachmentPickerSheet
        ref={attachmentPickerRef}
        onCamera={handleLaunchCamera}
        onDocs={handlePickDocument}
        onConfirm={handleAddPickerAssets}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
  },
  compactComposer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: INPUT_PILL_GAP,
    minHeight: INPUT_PILL_HEIGHT,
    borderRadius: INPUT_PILL_RADIUS,
    paddingLeft: INPUT_PILL_INSET,
    paddingRight: INPUT_PILL_INSET,
  },
  expandedComposer: {
    minHeight: verticalScale(214),
    borderRadius: 28,
    paddingTop: scale(10),
    paddingHorizontal: scale(12),
    paddingBottom: scale(12),
  },
  plusButton: {
    width: SECONDARY_ACTION_SIZE,
    height: SECONDARY_ACTION_SIZE,
    borderRadius: SECONDARY_ACTION_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  compactInputWrap: {
    flex: 1,
    minHeight: SECONDARY_ACTION_SIZE,
    justifyContent: 'center',
  },
  recordingInputWrap: {
    borderRadius: 18,
    backgroundColor: COLORS.brandSubtle,
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
  },
  compactTextInput: {
    fontFamily: FONTS.sans,
    fontSize: moderateScale(15),
    color: COLORS.textStrong,
    paddingVertical: 0,
    minHeight: verticalScale(24),
    textAlignVertical: 'center',
  },
  recordingTextInput: {
    backgroundColor: COLORS.brandSubtle,
    borderRadius: 14,
    paddingHorizontal: scale(8),
  },
  compactActionRow: {
    flexDirection: 'row',
    gap: INPUT_PILL_GAP,
    alignItems: 'center',
  },
  callButton: {
    width: PRIMARY_ACTION_SIZE,
    height: PRIMARY_ACTION_SIZE,
    borderRadius: PRIMARY_ACTION_SIZE / 2,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 3,
  },
  compactSendButton: {
    width: PRIMARY_ACTION_SIZE,
    height: PRIMARY_ACTION_SIZE,
    borderRadius: PRIMARY_ACTION_SIZE / 2,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 3,
  },
  compactStopButton: {
    width: PRIMARY_ACTION_SIZE,
    height: PRIMARY_ACTION_SIZE,
    borderRadius: PRIMARY_ACTION_SIZE / 2,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.4,
  },
  assetStrip: {
    flexGrow: 0,
  },
  assetStripContent: {
    gap: scale(8),
    paddingRight: scale(8),
  },
  selectedAsset: {
    width: scale(82),
    height: scale(82),
    position: 'relative',
  },
  assetPressable: {
    width: scale(78),
    height: scale(78),
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: COLORS.fillWeak,
  },
  assetThumb: {
    width: '100%',
    height: '100%',
  },
  assetAudioTile: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: COLORS.fillWeaker,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetFileTile: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: COLORS.fillWeaker,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetRemoveButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 2,
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: COLORS.textStrong,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.background,
  },
  assetUploadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoAssetOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  expandedTextInput: {
    flex: 1,
    fontFamily: FONTS.sans,
    fontSize: moderateScale(15),
    color: COLORS.textStrong,
    paddingTop: scale(12),
    paddingBottom: scale(4),
    paddingHorizontal: 0,
    minHeight: verticalScale(76),
    textAlignVertical: 'top',
  },
  expandedFooter: {
    minHeight: scale(64),
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  expandedSendButton: {
    width: scale(64),
    height: scale(64),
    borderRadius: 16,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedSendButtonDisabled: {
    opacity: 0.55,
  },
  expandedStopButton: {
    width: scale(64),
    height: scale(64),
    borderRadius: 16,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
