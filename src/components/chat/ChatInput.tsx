import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, TextInput, TouchableOpacity, Platform, StyleSheet,
  Keyboard, ScrollView, Image, ActivityIndicator, AccessibilityInfo, useWindowDimensions, InteractionManager,
} from 'react-native';
import { ArrowUp, AudioLines, Mic, Square, Plus, X, FileText, PhoneCall, Play } from 'lucide-react-native';
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
import {
  getComposerTextHeight,
  getComposerTextScrollEnabled,
  getExpandedComposerTextMaxHeight,
  shouldUseExpandedTextComposer,
} from '@/features/chat/composer-layout';
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
  maxComposerHeight?: number;
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
const SECONDARY_ACTION_SIZE = scale(40);
const PRIMARY_ACTION_SIZE = scale(50);
const EXPANDED_ACTION_SIZE = scale(52);
const INPUT_PILL_VERTICAL_INSET = scale(6);
const INPUT_PILL_HEIGHT = PRIMARY_ACTION_SIZE + INPUT_PILL_VERTICAL_INSET * 2;
const COMPACT_COMPOSER_CONTENT_RADIUS = scale(24);
const PLUS_ICON_SURFACE_SIZE = scale(34);
const PLUS_ICON_EMPTY_RADIUS = PLUS_ICON_SURFACE_SIZE / 2;
const PLUS_ICON_ACTIVE_RADIUS = scale(12);
const ACTION_SQUIRCLE_RADIUS = scale(15);
const COMPACT_TEXT_MIN_HEIGHT = verticalScale(24);
const EXPANDED_TEXT_MIN_HEIGHT = verticalScale(34);
const SELECTED_ASSET_OUTER_SIZE = scale(74);
const SELECTED_ASSET_SIZE = scale(70);
const CHAT_HEADER_RESERVE = verticalScale(72);
const TEXT_HEIGHT_BUFFER = verticalScale(6);
const COMPACT_MULTILINE_VERTICAL_PADDING = scale(12);
const EXPANDED_TEXT_VERTICAL_PADDING = scale(6);
const EXPANDED_COMPOSER_CHROME_HEIGHT = scale(30);
const COMPACT_TEXT_EXPANSION_BUFFER = scale(8);

// ─── Component ────────────────────────────────────────────────────────────────

export function ChatInput({
  onSend,
  onVoice,
  onStop,
  disabled,
  placeholder = 'Type here to start a conversation',
  loading,
  maxComposerHeight,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [multiline, setMultiline] = useState(false);
  const [compactTextHeight, setCompactTextHeight] = useState(COMPACT_TEXT_MIN_HEIGHT);
  const [expandedTextHeight, setExpandedTextHeight] = useState(EXPANDED_TEXT_MIN_HEIGHT);
  const [compactMeasuredHeight, setCompactMeasuredHeight] = useState(COMPACT_TEXT_MIN_HEIGHT);
  const [compactMeasuredPadding, setCompactMeasuredPadding] = useState(0);
  const [expandedMeasuredHeight, setExpandedMeasuredHeight] = useState(EXPANDED_TEXT_MIN_HEIGHT);
  const [isTextComposerExpanded, setIsTextComposerExpanded] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  const btnScale = useSharedValue(1);
  const micPulse = useSharedValue(1);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
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
  }, []);

  const handleTranscript = useCallback((finalText: string) => {
    const prefix = textBeforeDictationRef.current;
    const combined = prefix ? `${prefix} ${finalText}` : finalText;
    setText(combined);
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
      (event) => {
        setKeyboardVisible(true);
        setKeyboardHeight(event.endCoordinates?.height ?? 0);
      },
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      },
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
    setCompactTextHeight(COMPACT_TEXT_MIN_HEIGHT);
    setExpandedTextHeight(EXPANDED_TEXT_MIN_HEIGHT);
    setCompactMeasuredHeight(COMPACT_TEXT_MIN_HEIGHT);
    setCompactMeasuredPadding(0);
    setExpandedMeasuredHeight(EXPANDED_TEXT_MIN_HEIGHT);
    setIsTextComposerExpanded(false);
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
    if (!previousText) {
      setMultiline(false);
      setCompactTextHeight(COMPACT_TEXT_MIN_HEIGHT);
      setExpandedTextHeight(EXPANDED_TEXT_MIN_HEIGHT);
      setCompactMeasuredHeight(COMPACT_TEXT_MIN_HEIGHT);
      setCompactMeasuredPadding(0);
      setExpandedMeasuredHeight(EXPANDED_TEXT_MIN_HEIGHT);
      setIsTextComposerExpanded(false);
    }
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
  const hasText = text.trim().length > 0;
  const showStop = loading;
  const showSend = !loading && hasContent && !isRecording && !anyUploading;
  const previewable = attachmentState.previewable;
  const bottomPadding = keyboardVisible
    ? verticalScale(8)
    : insets.bottom;
  const visibleHeight = Math.max(
    verticalScale(280),
    windowHeight - (keyboardVisible ? keyboardHeight : 0) - insets.top - bottomPadding,
  );
  const keyboardAwareComposerMaxHeight = Math.max(verticalScale(180), visibleHeight - CHAT_HEADER_RESERVE);
  const composerMaxHeight = maxComposerHeight ?? keyboardAwareComposerMaxHeight;
  const textOnlyTextMaxHeight = Math.max(
    COMPACT_TEXT_MIN_HEIGHT,
    composerMaxHeight - EXPANDED_ACTION_SIZE - EXPANDED_COMPOSER_CHROME_HEIGHT,
  );
  const compactTextMaxHeight = hasText
    ? textOnlyTextMaxHeight
    : Math.max(COMPACT_TEXT_MIN_HEIGHT, composerMaxHeight - scale(18));
  const expandedTextMaxHeight = getExpandedComposerTextMaxHeight({
    composerMaxHeight,
    assetStripHeight: SELECTED_ASSET_OUTER_SIZE,
    actionRowHeight: EXPANDED_ACTION_SIZE,
    composerChromeHeight: EXPANDED_COMPOSER_CHROME_HEIGHT,
    minHeight: EXPANDED_TEXT_MIN_HEIGHT,
  });
  const activeExpandedTextMaxHeight = hasAttachments ? expandedTextMaxHeight : textOnlyTextMaxHeight;

  useEffect(() => {
    setCompactTextHeight((prev) => Math.min(prev, compactTextMaxHeight));
    setExpandedTextHeight((prev) => Math.min(prev, activeExpandedTextMaxHeight));
  }, [activeExpandedTextMaxHeight, compactTextMaxHeight]);

  const handleOpenAttachmentPicker = useCallback(() => {
    if (disabled || anyUploading) return;
    Haptics.selectionAsync();
    // Dismiss the keyboard first so it doesn't overlay the sheet as it rises.
    // On Android a small delay is needed to let the keyboard begin animating away
    // before the sheet snaps up.
    Keyboard.dismiss();
    if (Platform.OS === 'android') {
      const task = InteractionManager.runAfterInteractions(() => {
        attachmentPickerRef.current?.present();
      });
      return () => task.cancel();
    }
    attachmentPickerRef.current?.present();
  }, [anyUploading, disabled]);

  const handleTextChange = useCallback((nextText: string) => {
    if (isRecording) textBeforeDictationRef.current = nextText;
    setText(nextText);
    if (!nextText) {
      setMultiline(false);
      setCompactTextHeight(COMPACT_TEXT_MIN_HEIGHT);
      setExpandedTextHeight(EXPANDED_TEXT_MIN_HEIGHT);
      setCompactMeasuredHeight(COMPACT_TEXT_MIN_HEIGHT);
      setCompactMeasuredPadding(0);
      setExpandedMeasuredHeight(EXPANDED_TEXT_MIN_HEIGHT);
      setIsTextComposerExpanded(false);
    }
  }, [isRecording]);

  const handleCompactContentSizeChange = useCallback((event: any) => {
    const measuredHeight = Math.ceil(event.nativeEvent.contentSize.height);
    const shouldExpand = measuredHeight > COMPACT_TEXT_MIN_HEIGHT + 1;
    const verticalPadding = shouldExpand ? COMPACT_MULTILINE_VERTICAL_PADDING : 0;
    setCompactMeasuredHeight(measuredHeight);
    setCompactMeasuredPadding(verticalPadding);
    const nextHeight = getComposerTextHeight({
      measuredHeight,
      minHeight: COMPACT_TEXT_MIN_HEIGHT,
      maxHeight: compactTextMaxHeight,
      verticalPadding,
      buffer: TEXT_HEIGHT_BUFFER,
    });

    setMultiline(shouldExpand);
    setCompactTextHeight((prev) => (Math.abs(prev - nextHeight) > 1 ? nextHeight : prev));
  }, [compactTextMaxHeight]);

  const handleExpandedContentSizeChange = useCallback((event: any) => {
    const measuredHeight = Math.ceil(event.nativeEvent.contentSize.height);
    setExpandedMeasuredHeight(measuredHeight);
    const nextHeight = getComposerTextHeight({
      measuredHeight,
      minHeight: EXPANDED_TEXT_MIN_HEIGHT,
      maxHeight: activeExpandedTextMaxHeight,
      verticalPadding: EXPANDED_TEXT_VERTICAL_PADDING,
      buffer: TEXT_HEIGHT_BUFFER,
    });

    setExpandedTextHeight((prev) => (Math.abs(prev - nextHeight) > 1 ? nextHeight : prev));
  }, [activeExpandedTextMaxHeight]);

  const compactTextScrollable = getComposerTextScrollEnabled({
    measuredHeight: compactMeasuredHeight,
    renderedHeight: compactTextHeight,
    verticalPadding: compactMeasuredPadding,
    buffer: TEXT_HEIGHT_BUFFER,
    maxHeight: compactTextMaxHeight,
  });
  const expandedTextScrollable = getComposerTextScrollEnabled({
    measuredHeight: expandedMeasuredHeight,
    renderedHeight: expandedTextHeight,
    verticalPadding: EXPANDED_TEXT_VERTICAL_PADDING,
    buffer: TEXT_HEIGHT_BUFFER,
    maxHeight: activeExpandedTextMaxHeight,
  });
  const useExpandedComposer = shouldUseExpandedTextComposer({
    hasAttachments,
    hasText,
    textHeight: compactTextHeight,
    collapsedActionSize: SECONDARY_ACTION_SIZE,
    expansionBuffer: COMPACT_TEXT_EXPANSION_BUFFER,
    isExpanded: isTextComposerExpanded,
  });

  useEffect(() => {
    if (!hasText) {
      if (isTextComposerExpanded) setIsTextComposerExpanded(false);
      return;
    }

    if (useExpandedComposer && !isTextComposerExpanded) {
      setIsTextComposerExpanded(true);
    }
  }, [hasText, isTextComposerExpanded, useExpandedComposer]);

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
        headerMode="close-only"
        onClose={() => setPreviewVisible(false)}
      />

      <View
        style={[
          styles.floatingContainer,
          useExpandedComposer ? styles.expandedComposer : styles.compactComposer,
          !useExpandedComposer && hasContent && styles.compactComposerWithContent,
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

            <View style={styles.expandedControlRow}>
              <TouchableOpacity
                onPress={handleOpenAttachmentPicker}
                disabled={disabled || anyUploading}
                style={styles.plusButton}
              >
                <View style={[styles.plusIconSurface, styles.plusIconSurfaceActive]}>
                  <Plus size={scale(18)} color={COLORS.textBase} strokeWidth={1.8} />
                </View>
              </TouchableOpacity>

              <View style={[styles.expandedInputWrap, isRecording && styles.recordingInputWrap]}>
                <TextInput
                  value={text}
                  onChangeText={handleTextChange}
                  placeholder={isRecording ? 'Listening…' : placeholder}
                  placeholderTextColor={isRecording ? COLORS.brand : COLORS.textMuted}
                  selectionColor={isRecording ? COLORS.brand : COLORS.textStrong}
                  multiline
                  onContentSizeChange={handleExpandedContentSizeChange}
                  scrollEnabled={expandedTextScrollable}
                  style={[
                    styles.expandedTextInput,
                    { height: expandedTextHeight, maxHeight: activeExpandedTextMaxHeight },
                    isRecording && styles.recordingTextInput,
                  ]}
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
                    style={styles.expandedStopButton}
                  >
                    <Square size={scale(14)} color={COLORS.textBase} fill={COLORS.textBase} strokeWidth={0} />
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
                      <ArrowUp size={scale(22)} color={COLORS.textInverse} strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                </Animated.View>
              )}
            </View>
          </>
        ) : useExpandedComposer && hasContent ? (
          <>
            <View style={[styles.textOnlyInputWrap, isRecording && styles.recordingInputWrap]}>
              <TextInput
                value={text}
                onChangeText={handleTextChange}
                onContentSizeChange={handleExpandedContentSizeChange}
                scrollEnabled={expandedTextScrollable}
                placeholder={isRecording ? 'Listening…' : placeholder}
                placeholderTextColor={isRecording ? COLORS.brand : COLORS.textMuted}
                selectionColor={isRecording ? COLORS.brand : COLORS.textStrong}
                multiline
                style={[
                  styles.expandedTextInput,
                  { height: expandedTextHeight, maxHeight: activeExpandedTextMaxHeight },
                  isRecording && styles.recordingTextInput,
                ]}
                blurOnSubmit={false}
                editable={!disabled}
              />
              {isRecording && (
                <RecordingStatus seconds={duration} compact onCancel={handleCancelRecording} />
              )}
            </View>

            <View style={styles.textOnlyControlRow}>
              <TouchableOpacity
                onPress={handleOpenAttachmentPicker}
                disabled={disabled || anyUploading}
                style={styles.plusButton}
              >
                <View style={[styles.plusIconSurface, styles.plusIconSurfaceActive]}>
                  <Plus size={scale(18)} color={COLORS.textBase} strokeWidth={1.8} />
                </View>
              </TouchableOpacity>

              {showStop ? (
                <Animated.View style={btnAnimStyle}>
                  <TouchableOpacity
                    onPress={handleStop}
                    onPressIn={() => { btnScale.value = withSpring(0.9); }}
                    onPressOut={() => { btnScale.value = withSpring(1); }}
                    style={styles.expandedStopButton}
                  >
                    <Square size={scale(14)} color={COLORS.textBase} fill={COLORS.textBase} strokeWidth={0} />
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
                      <ArrowUp size={scale(22)} color={COLORS.textInverse} strokeWidth={2.5} />
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
              <View
                style={[
                  styles.plusIconSurface,
                  hasText ? styles.plusIconSurfaceActive : styles.plusIconSurfaceEmpty,
                ]}
              >
                <Plus size={scale(18)} color={COLORS.textBase} strokeWidth={1.8} />
              </View>
            </TouchableOpacity>

            <View style={[styles.compactInputWrap, isRecording && styles.recordingInputWrap]}>
              <TextInput
                value={text}
                onChangeText={handleTextChange}
                onContentSizeChange={handleCompactContentSizeChange}
                scrollEnabled={compactTextScrollable}
                placeholder={isRecording ? 'Listening…' : placeholder}
                placeholderTextColor={isRecording ? COLORS.brand : COLORS.textMuted}
                selectionColor={isRecording ? COLORS.brand : COLORS.textStrong}
                multiline
                style={[
                  styles.compactTextInput,
                  multiline && styles.compactTextInputMultiline,
                  { height: compactTextHeight, maxHeight: compactTextMaxHeight },
                  isRecording && styles.recordingTextInput,
                ]}
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
                  <Square size={scale(14)} color={COLORS.textBase} fill={COLORS.textBase} strokeWidth={0} />
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
                  <ArrowUp size={scale(20)} color={COLORS.textInverse} strokeWidth={2.5} />
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
                    <Mic size={scale(18)} color={isRecording ? COLORS.textInverse : COLORS.textBase} strokeWidth={2} />
                  </RecordingIconButton>
                </Animated.View>
                {onVoice && !isRecording && (
                  <TouchableOpacity
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onVoice(); }}
                    disabled={disabled}
                    style={[styles.callButton, disabled && styles.disabledButton]}
                  >
                    <PhoneCall size={scale(21)} color={COLORS.textInverse} strokeWidth={2} />
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
  compactComposerWithContent: {
    borderRadius: COMPACT_COMPOSER_CONTENT_RADIUS,
  },
  expandedComposer: {
    borderRadius: 26,
    paddingTop: scale(8),
    paddingHorizontal: scale(10),
    paddingBottom: scale(10),
    gap: scale(6),
  },
  plusButton: {
    width: SECONDARY_ACTION_SIZE,
    height: SECONDARY_ACTION_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  plusIconSurface: {
    width: PLUS_ICON_SURFACE_SIZE,
    height: PLUS_ICON_SURFACE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.fillWeak,
  },
  plusIconSurfaceEmpty: {
    borderRadius: PLUS_ICON_EMPTY_RADIUS,
  },
  plusIconSurfaceActive: {
    borderRadius: PLUS_ICON_ACTIVE_RADIUS,
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
    minHeight: COMPACT_TEXT_MIN_HEIGHT,
    textAlignVertical: 'center',
  },
  compactTextInputMultiline: {
    paddingTop: scale(6),
    paddingBottom: scale(6),
    textAlignVertical: 'top',
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
    borderRadius: ACTION_SQUIRCLE_RADIUS,
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
    borderRadius: ACTION_SQUIRCLE_RADIUS,
    backgroundColor: COLORS.fillWeak,
    borderWidth: 1,
    borderColor: COLORS.strokeWeak,
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
    alignItems: 'center',
  },
  selectedAsset: {
    width: SELECTED_ASSET_OUTER_SIZE,
    height: SELECTED_ASSET_OUTER_SIZE,
    position: 'relative',
  },
  assetPressable: {
    width: SELECTED_ASSET_SIZE,
    height: SELECTED_ASSET_SIZE,
    borderRadius: 10,
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
    borderRadius: 10,
    backgroundColor: COLORS.fillWeaker,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetFileTile: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    backgroundColor: COLORS.fillWeaker,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetRemoveButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 2,
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
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
    fontFamily: FONTS.sans,
    fontSize: moderateScale(15),
    color: COLORS.textStrong,
    paddingTop: scale(3),
    paddingBottom: scale(3),
    paddingHorizontal: scale(8),
    minHeight: EXPANDED_TEXT_MIN_HEIGHT,
    textAlignVertical: 'top',
  },
  expandedControlRow: {
    minHeight: EXPANDED_ACTION_SIZE,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: INPUT_PILL_GAP,
  },
  expandedInputWrap: {
    flex: 1,
    minHeight: SECONDARY_ACTION_SIZE,
    justifyContent: 'center',
  },
  textOnlyInputWrap: {
    minHeight: COMPACT_TEXT_MIN_HEIGHT,
    justifyContent: 'flex-start',
  },
  textOnlyControlRow: {
    minHeight: EXPANDED_ACTION_SIZE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: INPUT_PILL_GAP,
  },
  expandedSendButton: {
    width: EXPANDED_ACTION_SIZE,
    height: EXPANDED_ACTION_SIZE,
    borderRadius: ACTION_SQUIRCLE_RADIUS,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedSendButtonDisabled: {
    opacity: 0.55,
  },
  expandedStopButton: {
    width: EXPANDED_ACTION_SIZE,
    height: EXPANDED_ACTION_SIZE,
    borderRadius: ACTION_SQUIRCLE_RADIUS,
    backgroundColor: COLORS.fillWeak,
    borderWidth: 1,
    borderColor: COLORS.strokeWeak,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
