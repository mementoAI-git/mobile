import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as Device from 'expo-device';
import {
  View, TextInput, TouchableOpacity, Platform, StyleSheet,
  Keyboard, ScrollView, Image, ActivityIndicator, AccessibilityInfo, useWindowDimensions, InteractionManager,
  UIManager, LayoutAnimation,
} from 'react-native';
import { ArrowUp, AudioLines, Mic, Square, Plus, X, FileText, Play, Smile } from 'lucide-react-native';
import { MediaPreviewModal, type PreviewAttachment } from '@/components/ui/MediaPreviewModal';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  ChatAttachmentPickerSheet,
  type ChatPickerAsset,
} from '@/components/chat/ChatAttachmentPickerSheet';
import { EmojiPickerSheet } from '@/components/chat/EmojiPickerSheet';
import { insertEmojiAtPosition } from '@/features/chat/emoji-data';
import { RecordingIconButton } from '@/components/ui/RecordingIconButton';
import { RecordingStatus } from '@/components/ui/RecordingStatus';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  FadeIn,
  FadeOut,
  FadeInDown,
  LinearTransition,
  Easing,
} from 'react-native-reanimated';
import {
  hs,
  vs,
  ms,
  iconSize,
  radius,
  responsiveSpace,
  minTouchTarget,
} from '@/constants/responsive';
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
  getChatComposerControls,
  getChatComposerBottomPadding,
  getExpandedComposerTextMaxHeight,
  shouldUseExpandedTextComposer,
} from '@/features/chat/composer-layout';
import type { IFile, IMessageAttachment } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type AttachmentItem = UploadAttachment<IFile>;
type ChatAttachmentPreview = IMessageAttachment;

// ─── Stable attachment strip tile ────────────────────────────────────────────
// Extracted from the ScrollView map so press handlers don't recreate per render.

const MemoAttachmentTile = React.memo(function MemoAttachmentTile({
  attachment,
  previewIdx,
  onPreview,
  onRemove,
}: {
  attachment: AttachmentItem;
  previewIdx: number;
  onPreview: (idx: number) => void;
  onRemove: (clientId: string) => void;
}) {
  const isMedia = attachment.mimeType.startsWith('image/') || attachment.mimeType.startsWith('video/');
  const isVideo = attachment.mimeType.startsWith('video/');
  const isAudio = attachment.mimeType.startsWith('audio/');

  const handlePreviewPress = useCallback(() => {
    if (!attachment.isUploading && previewIdx >= 0) {
      Haptics.selectionAsync();
      onPreview(previewIdx);
    }
  }, [attachment.isUploading, previewIdx, onPreview]);

  const handleRemovePress = useCallback(() => {
    onRemove(attachment.clientId);
  }, [attachment.clientId, onRemove]);

  return (
    <View style={chatInputStyles.selectedAsset}>
      <TouchableOpacity
        onPress={handlePreviewPress}
        activeOpacity={previewIdx >= 0 ? 0.84 : 1}
        style={chatInputStyles.assetPressable}
      >
        {isMedia ? (
          <>
            <Image source={{ uri: attachment.uri }} style={chatInputStyles.assetThumb} resizeMode="cover" />
            {isVideo && (
              <View style={chatInputStyles.videoAssetOverlay}>
                <Play size={iconSize(18)} color={COLORS.textInverse} fill={COLORS.textInverse} strokeWidth={0} />
              </View>
            )}
          </>
        ) : isAudio ? (
          <View style={chatInputStyles.assetAudioTile}>
            <AudioLines size={iconSize(23)} color={COLORS.brand} strokeWidth={2.3} />
          </View>
        ) : (
          <View style={chatInputStyles.assetFileTile}>
            <FileText size={iconSize(22)} color={COLORS.brand} strokeWidth={2} />
          </View>
        )}
        {attachment.isUploading && (
          <View style={chatInputStyles.assetUploadingOverlay}>
            <ActivityIndicator color={COLORS.textInverse} />
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handleRemovePress}
        activeOpacity={0.82}
        hitSlop={11}
        style={chatInputStyles.assetRemoveButton}
      >
        <X size={iconSize(13)} color={COLORS.textInverse} strokeWidth={2.6} />
      </TouchableOpacity>
    </View>
  );
});

// Forward-declare style reference used by MemoAttachmentTile (populated below in StyleSheet.create)
let chatInputStyles: ReturnType<typeof StyleSheet.create<any>>;


export interface ChatSendPayload {
  text: string;
  attachmentIds: string[];
  attachmentPreviews: ChatAttachmentPreview[];
}

interface ChatInputProps {
  onSend: (payload: ChatSendPayload) => void;
  onStop?: () => void;
  disabled?: boolean;
  placeholder?: string;
  loading?: boolean;
  maxComposerHeight?: number;
  parentOwnsBottomSafeArea?: boolean;
  initialAudioUri?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INPUT_PILL_INSET = 6;
const INPUT_PILL_GAP = 4;
const SECONDARY_ACTION_SIZE = 36;
const PRIMARY_ACTION_SIZE = 36;
const EXPANDED_ACTION_SIZE = 44;
const INPUT_PILL_VERTICAL_INSET = 6;
const INPUT_PILL_HEIGHT = PRIMARY_ACTION_SIZE + INPUT_PILL_VERTICAL_INSET * 2;
const INPUT_PILL_RADIUS = INPUT_PILL_HEIGHT / 2;
const COMPACT_COMPOSER_CONTENT_RADIUS = INPUT_PILL_RADIUS;
const PLUS_ICON_SURFACE_SIZE = 36;
const PLUS_ICON_EMPTY_RADIUS = PLUS_ICON_SURFACE_SIZE / 2;
const PLUS_ICON_ACTIVE_RADIUS = radius(12);
const ACTION_SQUIRCLE_RADIUS = radius(18);
const COMPACT_TEXT_MIN_HEIGHT = Platform.select({
  ios: vs(24),
  android: vs(24),
}) as number;
const COMPACT_MULTILINE_VERTICAL_PADDING = responsiveSpace(4);
const EXPANDED_TEXT_MIN_HEIGHT = vs(22);
const SELECTED_ASSET_OUTER_SIZE = hs(74);
const SELECTED_ASSET_SIZE = hs(70);
const CHAT_HEADER_RESERVE = vs(72);
const MULTILINE_DETECTION_BUFFER = 4;
const TEXT_HEIGHT_BUFFER = 0;
const EXPANDED_TEXT_VERTICAL_PADDING = 0;
const EXPANDED_COMPOSER_CHROME_HEIGHT = responsiveSpace(20);
const COMPACT_TEXT_EXPANSION_BUFFER = 0;

// ─── Component ────────────────────────────────────────────────────────────────

export function ChatInput({
  onSend,
  onStop,
  disabled,
  placeholder = 'Type a message...',
  loading,
  maxComposerHeight,
  parentOwnsBottomSafeArea = false,
  initialAudioUri,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [multiline, setMultiline] = useState(false);
  const [compactTextHeight, setCompactTextHeight] = useState(COMPACT_TEXT_MIN_HEIGHT);
  const [expandedTextHeight, setExpandedTextHeight] = useState(EXPANDED_TEXT_MIN_HEIGHT);
  const [compactMeasuredHeight, setCompactMeasuredHeight] = useState(COMPACT_TEXT_MIN_HEIGHT);
  const [compactMeasuredPadding, setCompactMeasuredPadding] = useState(0);
  const [expandedMeasuredHeight, setExpandedMeasuredHeight] = useState(EXPANDED_TEXT_MIN_HEIGHT);
  const [isTextComposerExpanded, setIsTextComposerExpanded] = useState(Boolean(initialAudioUri));
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const attachmentPickerRef = useRef<BottomSheetModal>(null);
  const emojiPickerRef = useRef<BottomSheetModal>(null);
  const textInputRef = useRef<TextInput>(null);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  const btnScale = useSharedValue(1);
  const micPulse = useSharedValue(1);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { toast } = useToast();

  const textBeforeDictationRef = useRef('');
  const lastAppliedContentSizeRef = useRef<{ mode: 'compact' | 'expanded'; measured: number; target: number } | null>(null);

  const isSendingRef = useRef(false);
  const sendingResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressMeasurementRef = useRef(false);
  const suppressMeasurementTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suppressMeasurementsBriefly = useCallback(() => {
    suppressMeasurementRef.current = true;
    if (suppressMeasurementTimeoutRef.current) {
      clearTimeout(suppressMeasurementTimeoutRef.current);
    }
    suppressMeasurementTimeoutRef.current = setTimeout(() => {
      suppressMeasurementRef.current = false;
    }, 120);
  }, []);

  useEffect(() => () => {
    if (suppressMeasurementTimeoutRef.current) {
      clearTimeout(suppressMeasurementTimeoutRef.current);
    }
    if (sendingResetTimeoutRef.current) {
      clearTimeout(sendingResetTimeoutRef.current);
    }
  }, []);

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



  // ─── Voice-to-text ────────────────────────────────────────────────────────

  const handleVoiceError = useCallback((err: Error) => {
    const lower = err.message.toLowerCase();
    if (lower.includes('permission')) {
      toast('Allow microphone and speech recognition access to dictate.', 'info');
    } else if (!Device.isDevice || lower.includes('speech') || lower.includes('recognition') || lower.includes('1700')) {
      toast('Live speech dictation requires a physical device with Siri/Dictation enabled.', 'info');
    } else {
      toast('Voice dictation stopped. Try again.', 'info');
    }
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

  // ─── Mic pulse animation ──────────────────────────────────────────────────

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
      () => {
        setKeyboardVisible(true);
      },
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      },
    );
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => { if (mounted) setReduceMotionEnabled(enabled); })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotionEnabled);
    return () => { mounted = false; sub.remove(); };
  }, []);

  // ─── Attachment pickers ───────────────────────────────────────────────────

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
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'], quality: 0.85 });
      if (!result.canceled && result.assets.length > 0) {
        const asset = getMediaUploadInput(result.assets[0]);
        await uploadAndAdd(asset.uri, asset.mimeType, asset.name, { fileSize: asset.fileSize });
      }
    } catch { /* user cancelled */ }
  }, [uploadAndAdd]);

  const handleAddPickerAssets = useCallback(async (pickedAssets: ChatPickerAsset[]) => {
    await Promise.all(pickedAssets.map(asset =>
      uploadAndAdd(asset.uploadUri, asset.mimeType, asset.name, { fileSize: asset.fileSize })
    ));
  }, [uploadAndAdd]);

  const handlePickDocument = useCallback(async () => {
    Haptics.selectionAsync();
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: DOCUMENT_PICKER_MIME_TYPES,
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (!result.canceled && result.assets.length > 0) {
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

  const handlePickAudio = useCallback(async () => {
    Haptics.selectionAsync();
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/wav', 'audio/x-m4a', 'audio/aac'],
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (!result.canceled && result.assets.length > 0) {
        const validAssets = result.assets.filter(asset => {
          if (isFileTooLarge(asset.size)) {
            toast(`"${asset.name}" exceeds the ${MAX_ATTACHMENT_FILE_MB}MB limit.`, 'error');
            return false;
          }
          return true;
        });
        await Promise.all(validAssets.map((asset) => {
          const upload = getDocumentUploadInput(asset);
          return uploadAndAdd(upload.uri, upload.mimeType || 'audio/mpeg', upload.name, { fileSize: upload.fileSize });
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
    const readyAttachmentPreviews = uploadedAttachments.map((a): ChatAttachmentPreview => ({
      _id: a.fileId,
      url: a.file?.url ?? a.uri,
      name: a.file?.name ?? a.name,
      type: a.file?.type ?? a.mimeType,
      size: a.file?.size,
    }));
    if ((!trimmed && readyIds.length === 0) || disabled) return;
    if (hasUploadingAttachments(attachments)) return;

    isSendingRef.current = true;
    if (sendingResetTimeoutRef.current) clearTimeout(sendingResetTimeoutRef.current);
    sendingResetTimeoutRef.current = setTimeout(() => {
      isSendingRef.current = false;
    }, 300);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSend({ text: trimmed, attachmentIds: readyIds, attachmentPreviews: readyAttachmentPreviews });
    setText('');
    textInputRef.current?.clear();
    setMultiline(false);
    setCompactTextHeight(COMPACT_TEXT_MIN_HEIGHT);
    setExpandedTextHeight(EXPANDED_TEXT_MIN_HEIGHT);
    setCompactMeasuredHeight(COMPACT_TEXT_MIN_HEIGHT);
    setCompactMeasuredPadding(0);
    setExpandedMeasuredHeight(EXPANDED_TEXT_MIN_HEIGHT);
    setIsTextComposerExpanded(false);
    setIsFocused(false);
    textInputRef.current?.blur();
    Keyboard.dismiss();
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

  const handleBtnPressIn  = useCallback(() => { btnScale.value = withSpring(0.9); }, [btnScale]);
  const handleBtnPressOut = useCallback(() => { btnScale.value = withSpring(1);   }, [btnScale]);

  // ─── Derived layout values ────────────────────────────────────────────────

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
          thumbnailUrl: attachment.file?.thumbnail,
          persistedFileId: attachment.file?._id,
          access: attachment.file?.access,
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
  const controls = getChatComposerControls({
    anyUploading,
    disabled: Boolean(disabled),
    hasContent,
    isRecording,
    loading: Boolean(loading),
    isFocused,
  });
  const previewable = attachmentState.previewable;

  const bottomPadding = getChatComposerBottomPadding({
    keyboardVisible,
    bottomInset: insets.bottom,
    parentOwnsBottomSafeArea,
    keyboardGap: 8,
  });
  const fallbackComposerMaxHeight = Math.max(
    vs(180),
    windowHeight - insets.top - Math.max(insets.bottom, 8) - CHAT_HEADER_RESERVE,
  );
  const composerMaxHeight = maxComposerHeight ?? fallbackComposerMaxHeight;
  const textOnlyTextMaxHeight = Math.max(
    COMPACT_TEXT_MIN_HEIGHT,
    composerMaxHeight - EXPANDED_ACTION_SIZE - EXPANDED_COMPOSER_CHROME_HEIGHT,
  );
  const compactTextMaxHeight = hasText
    ? textOnlyTextMaxHeight
    : Math.max(COMPACT_TEXT_MIN_HEIGHT, composerMaxHeight - responsiveSpace(18));
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

  // ─── Expansion state — declared early so handleContentSizeChange can read it ──

  const useExpandedComposer = shouldUseExpandedTextComposer({
    hasAttachments,
    hasText,
    isFocused,
    textHeight: compactTextHeight,
    collapsedActionSize: SECONDARY_ACTION_SIZE,
    expansionBuffer: COMPACT_TEXT_EXPANSION_BUFFER,
    isExpanded: isTextComposerExpanded,
    multiline,
    text,
  });

  useEffect(() => {
    if (!hasText && !hasAttachments) {
      if (isTextComposerExpanded) setIsTextComposerExpanded(false);
      return;
    }
    if (useExpandedComposer && !isTextComposerExpanded) {
      setIsTextComposerExpanded(true);
    }
  }, [hasAttachments, hasText, isTextComposerExpanded, useExpandedComposer]);

  const prevExpandedRef = useRef(useExpandedComposer);
  useEffect(() => {
    if (prevExpandedRef.current !== useExpandedComposer) {
      prevExpandedRef.current = useExpandedComposer;
      LayoutAnimation.configureNext(
        LayoutAnimation.create(
          200,
          LayoutAnimation.Types.easeInEaseOut,
          LayoutAnimation.Properties.opacity
        )
      );
    }
  }, [useExpandedComposer]);

  const handlePreviewAttachment = useCallback((idx: number) => {
    setPreviewIndex(idx);
    setPreviewVisible(true);
  }, []);

  // ─── Emoji picker opener ──────────────────────────────────────────────────

  const handleOpenEmojiPicker = useCallback(() => {
    if (disabled) return;
    Haptics.selectionAsync();
    Keyboard.dismiss();
    if (Platform.OS === 'android') {
      const task = InteractionManager.runAfterInteractions(() => {
        emojiPickerRef.current?.present();
      });
      return () => task.cancel();
    }
    emojiPickerRef.current?.present();
  }, [disabled]);

  const handleSelectEmoji = useCallback((emoji: string) => {
    setText((prevText) => {
      const { newText, newCursor } = insertEmojiAtPosition(prevText, emoji, selectionRef.current);
      selectionRef.current = { start: newCursor, end: newCursor };
      return newText;
    });
    setIsTextComposerExpanded(true);
  }, []);

  // ─── Attachment picker opener ─────────────────────────────────────────────

  const handleOpenAttachmentPicker = useCallback(() => {
    if (disabled || anyUploading) return;
    Haptics.selectionAsync();
    Keyboard.dismiss();
    if (Platform.OS === 'android') {
      const task = InteractionManager.runAfterInteractions(() => {
        attachmentPickerRef.current?.present();
      });
      return () => task.cancel();
    }
    attachmentPickerRef.current?.present();
  }, [anyUploading, disabled]);

  // ─── Text change handler ──────────────────────────────────────────────────

  const handleTextChange = useCallback((nextText: string) => {
    if (isSendingRef.current) return;
    if (isRecording) textBeforeDictationRef.current = nextText;
    setText(nextText);
    if (!nextText.trim()) {
      setMultiline(false);
      setCompactTextHeight(COMPACT_TEXT_MIN_HEIGHT);
      setExpandedTextHeight(EXPANDED_TEXT_MIN_HEIGHT);
      setCompactMeasuredHeight(COMPACT_TEXT_MIN_HEIGHT);
      setCompactMeasuredPadding(0);
      setExpandedMeasuredHeight(EXPANDED_TEXT_MIN_HEIGHT);
      setIsTextComposerExpanded(false);
    } else if (nextText.includes('\n')) {
      setMultiline(true);
      if (!isTextComposerExpanded) setIsTextComposerExpanded(true);
    }
  }, [isRecording, isTextComposerExpanded]);

  // ─── Content size change handlers ────────────────────────────────────────
  // A single onContentSizeChange handler is used regardless of expansion state.
  // This avoids switching handlers when the composer expands, which would cause
  // one render cycle of stale height data.

  const handleContentSizeChange = useCallback((event: any) => {
    if (suppressMeasurementRef.current) return;

    const measuredHeight = Math.ceil(event.nativeEvent.contentSize.height);


    if (!hasText && !hasAttachments) {
      lastAppliedContentSizeRef.current = null;
      setMultiline(false);
      setCompactTextHeight(COMPACT_TEXT_MIN_HEIGHT);
      setExpandedTextHeight(EXPANDED_TEXT_MIN_HEIGHT);
      setCompactMeasuredHeight(COMPACT_TEXT_MIN_HEIGHT);
      setCompactMeasuredPadding(0);
      setExpandedMeasuredHeight(EXPANDED_TEXT_MIN_HEIGHT);
      if (isTextComposerExpanded) setIsTextComposerExpanded(false);
      return;
    }

    const currentMode = useExpandedComposer ? 'expanded' : 'compact';
    const currentTarget = useExpandedComposer ? expandedTextHeight : compactTextHeight;

    const sameRenderedHeight = Math.abs(measuredHeight - currentTarget) <= 6;
    if (sameRenderedHeight) {
      if (useExpandedComposer) {
        setExpandedMeasuredHeight(measuredHeight);
      } else {
        setCompactMeasuredHeight(measuredHeight);
        setMultiline(measuredHeight > COMPACT_TEXT_MIN_HEIGHT + MULTILINE_DETECTION_BUFFER);
      }
      return;
    }

    if (
      lastAppliedContentSizeRef.current &&
      lastAppliedContentSizeRef.current.mode === currentMode &&
      Math.abs(lastAppliedContentSizeRef.current.measured - measuredHeight) <= 1 &&
      Math.abs(lastAppliedContentSizeRef.current.target - currentTarget) <= 1
    ) {
      return;
    }

    if (useExpandedComposer) {
      const nextHeight = getComposerTextHeight({
        measuredHeight,
        minHeight: EXPANDED_TEXT_MIN_HEIGHT,
        maxHeight: activeExpandedTextMaxHeight,
        verticalPadding: EXPANDED_TEXT_VERTICAL_PADDING,
        buffer: TEXT_HEIGHT_BUFFER,
      });

      lastAppliedContentSizeRef.current = { mode: 'expanded', measured: measuredHeight, target: nextHeight };

      if (Math.abs(expandedTextHeight - nextHeight) <= 1) {
        setExpandedMeasuredHeight(measuredHeight);
        return;
      }

      setExpandedMeasuredHeight(measuredHeight);
      suppressMeasurementsBriefly();
      setExpandedTextHeight(nextHeight);
      return;
    }

    const shouldExpand = Boolean(measuredHeight > COMPACT_TEXT_MIN_HEIGHT + MULTILINE_DETECTION_BUFFER || (text && text.includes('\n')));
    if (shouldExpand && !isTextComposerExpanded) {
      setIsTextComposerExpanded(true);
    }

    const verticalPadding = shouldExpand ? COMPACT_MULTILINE_VERTICAL_PADDING : 0;
    const nextHeight = getComposerTextHeight({
      measuredHeight,
      minHeight: COMPACT_TEXT_MIN_HEIGHT,
      maxHeight: compactTextMaxHeight,
      verticalPadding,
      buffer: TEXT_HEIGHT_BUFFER,
    });

    lastAppliedContentSizeRef.current = { mode: 'compact', measured: measuredHeight, target: nextHeight };

    if (Math.abs(compactTextHeight - nextHeight) <= 1) {
      setCompactMeasuredHeight(measuredHeight);
      setCompactMeasuredPadding(verticalPadding);
      setMultiline(shouldExpand);
      return;
    }

    setCompactMeasuredHeight(measuredHeight);
    setCompactMeasuredPadding(verticalPadding);
    setMultiline(shouldExpand);
    suppressMeasurementsBriefly();
    setCompactTextHeight(nextHeight);
  }, [
    activeExpandedTextMaxHeight,
    compactTextHeight,
    compactTextMaxHeight,
    expandedTextHeight,
    hasAttachments,
    hasText,
    isTextComposerExpanded,
    text,
    useExpandedComposer,
    suppressMeasurementsBriefly,
  ]);

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

  // ─── Derived text input style ─────────────────────────────────────────────
  // The TextInput style adapts between compact and expanded — but the instance
  // stays mounted the entire time so the keyboard never dismisses.

  const textInputStyle = useMemo(() => {
    if (useExpandedComposer) {
      return [
        styles.sharedTextInput,
        styles.expandedTextInput,
        { minHeight: expandedTextHeight, maxHeight: activeExpandedTextMaxHeight },
        isRecording && styles.recordingTextInput,
      ];
    }
    return [
      styles.sharedTextInput,
      styles.compactTextInput,
      multiline && styles.compactTextInputMultiline,
      { 
        minHeight: Platform.OS === 'ios' && !multiline ? undefined : compactTextHeight, 
        maxHeight: compactTextMaxHeight 
      },
      isRecording && styles.recordingTextInput,
    ];
  }, [
    useExpandedComposer,
    expandedTextHeight,
    activeExpandedTextMaxHeight,
    compactTextHeight,
    compactTextMaxHeight,
    multiline,
    isRecording,
  ]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      style={{ paddingBottom: bottomPadding, paddingHorizontal: 16, paddingTop: 4 }}
    >
      {/* Preview modal for selected media assets */}
      <MediaPreviewModal
        visible={previewVisible}
        attachments={previewable}
        initialIndex={previewIndex}
        headerMode="close-only"
        onClose={() => setPreviewVisible(false)}
      />

      {/* ── Outer composer container — shape changes but TextInput stays mounted ── */}
      <Animated.View
        layout={LinearTransition.duration(200).easing(Easing.bezier(0.25, 0.1, 0.25, 1))}
        style={[
          styles.floatingContainer,
          useExpandedComposer ? styles.expandedComposer : styles.compactComposer,
          !useExpandedComposer && hasContent && styles.compactComposerWithContent,
        ]}
      >
        {/* ── Asset strip (expanded with attachments) ── */}
        {hasAttachments && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.assetStrip}
            contentContainerStyle={styles.assetStripContent}
          >
            {attachments.map(a => {
              const previewIdx = previewable.findIndex(p => p.clientId === a.clientId);
              return (
                <MemoAttachmentTile
                  key={a.clientId}
                  attachment={a}
                  previewIdx={previewIdx}
                  onPreview={handlePreviewAttachment}
                  onRemove={removeAttachment}
                />
              );
            })}
          </ScrollView>
        )}

        {/* ── Main input row — always rendered, never unmounted ── */}
        <View style={[
          styles.inputRow,
          useExpandedComposer ? styles.inputRowExpanded : styles.inputRowCompact,
        ]}>

          {/* Plus / attach button (compact mode: inline on left) */}
          {!useExpandedComposer && (
            <TouchableOpacity
              onPress={handleOpenAttachmentPicker}
              disabled={disabled || anyUploading}
              hitSlop={6}
              style={styles.plusButton}
            >
              <View style={[
                styles.plusIconSurface,
                (hasText || hasAttachments) ? styles.plusIconSurfaceActive : styles.plusIconSurfaceEmpty,
              ]}>
                <Plus size={iconSize(18)} color={COLORS.textBase} strokeWidth={1.8} />
              </View>
            </TouchableOpacity>
          )}

          {/* ── THE SINGLE STABLE TEXT INPUT ── */}
          <View style={[
            styles.textWrap,
            useExpandedComposer ? styles.textWrapExpanded : styles.textWrapCompact,
            isRecording && styles.recordingInputWrap,
          ]}>
            <TextInput
              ref={textInputRef}
              value={text}
              onChangeText={handleTextChange}
              onContentSizeChange={handleContentSizeChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onSelectionChange={(e) => {
                selectionRef.current = e.nativeEvent.selection;
              }}
              scrollEnabled={useExpandedComposer ? expandedTextScrollable : compactTextScrollable}
              placeholder={isRecording ? 'Listening…' : placeholder}
              placeholderTextColor={isRecording ? COLORS.brand : COLORS.textMuted}
              selectionColor={isRecording ? COLORS.brand : COLORS.textStrong}
              multiline
              maxFontSizeMultiplier={1.3}
              style={textInputStyle}
              blurOnSubmit={false}
              editable={!disabled}
            />
            {isRecording && (
              <RecordingStatus seconds={duration} compact onCancel={handleCancelRecording} />
            )}
          </View>

          {/* Action buttons (expanded: bottom toolbar row; compact: inline on right) */}
          {useExpandedComposer ? (
            <Animated.View
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(120)}
              style={styles.expandedBottomToolbar}
            >
              <TouchableOpacity
                onPress={handleOpenAttachmentPicker}
                disabled={disabled || anyUploading}
                hitSlop={6}
                style={styles.plusButton}
              >
                <View style={[
                  styles.plusIconSurface,
                  (hasText || hasAttachments) ? styles.plusIconSurfaceActive : styles.plusIconSurfaceEmpty,
                ]}>
                  <Plus size={iconSize(18)} color={COLORS.textBase} strokeWidth={1.8} />
                </View>
              </TouchableOpacity>

              <View style={{ flex: 1 }} />

              {controls.showStop ? (
                <Animated.View style={[btnAnimStyle, { flexShrink: 0 }]}>
                  <TouchableOpacity
                    onPress={handleStop}
                    onPressIn={handleBtnPressIn}
                    onPressOut={handleBtnPressOut}
                    style={styles.expandedStopButton}
                  >
                    <Square
                      size={iconSize(14)}
                      color={COLORS.textBase}
                      fill={COLORS.textBase}
                      strokeWidth={0}
                    />
                  </TouchableOpacity>
                </Animated.View>
              ) : (
                <View style={styles.compactActionRow}>
                  {controls.showMic && (
                    <Animated.View style={micPulseStyle}>
                      <RecordingIconButton
                        onPress={handleMicPress}
                        active={isRecording}
                        disabled={disabled}
                        muted={micUnavailable}
                        style={styles.compactMicButton}
                      >
                        <Mic
                          size={18}
                          color={isRecording ? COLORS.textInverse : COLORS.textBase}
                          strokeWidth={2}
                        />
                      </RecordingIconButton>
                    </Animated.View>
                  )}
                  {controls.showEmoji && (
                    <TouchableOpacity
                      onPress={handleOpenEmojiPicker}
                      disabled={disabled}
                      style={styles.compactEmojiButton}
                      activeOpacity={0.7}
                    >
                      <Smile
                        size={iconSize(20)}
                        color={COLORS.textBase}
                        strokeWidth={1.8}
                      />
                    </TouchableOpacity>
                  )}
                  {controls.showSend && (
                    <Animated.View style={[btnAnimStyle, { flexShrink: 0 }]}>
                      <TouchableOpacity
                        accessibilityLabel="Send message"
                        accessibilityRole="button"
                        accessibilityState={{ disabled: controls.sendDisabled }}
                        activeOpacity={0.76}
                        disabled={controls.sendDisabled}
                        onPress={handleSend}
                        onPressIn={handleBtnPressIn}
                        onPressOut={handleBtnPressOut}
                        style={[
                          styles.expandedSendButton,
                          controls.sendDisabled && styles.sendButtonDisabled,
                        ]}
                      >
                        {anyUploading ? (
                          <ActivityIndicator color={COLORS.textWeak} size="small" />
                        ) : (
                          <ArrowUp
                            size={iconSize(21)}
                            color={controls.sendDisabled ? COLORS.textDisabled : COLORS.textInverse}
                            strokeWidth={2.5}
                          />
                        )}
                      </TouchableOpacity>
                    </Animated.View>
                  )}
                </View>
              )}
            </Animated.View>
          ) : (
            controls.showStop ? (
              <Animated.View style={[btnAnimStyle, { flexShrink: 0 }]}>
                <TouchableOpacity
                  onPress={handleStop}
                  onPressIn={handleBtnPressIn}
                  onPressOut={handleBtnPressOut}
                  hitSlop={6}
                  style={styles.compactStopButton}
                >
                  <Square
                    size={iconSize(14)}
                    color={COLORS.textBase}
                    fill={COLORS.textBase}
                    strokeWidth={0}
                  />
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <View style={styles.compactActionRow}>
                {controls.showMic && (
                  <Animated.View style={micPulseStyle}>
                    <RecordingIconButton
                      onPress={handleMicPress}
                      active={isRecording}
                      disabled={disabled}
                      muted={micUnavailable}
                      style={styles.compactMicButton}
                    >
                      <Mic
                        size={iconSize(18)}
                        color={isRecording ? COLORS.textInverse : COLORS.textBase}
                        strokeWidth={2}
                      />
                    </RecordingIconButton>
                  </Animated.View>
                )}
                {controls.showEmoji && (
                  <TouchableOpacity
                    onPress={handleOpenEmojiPicker}
                    disabled={disabled}
                    hitSlop={6}
                    style={styles.compactEmojiButton}
                    activeOpacity={0.7}
                  >
                    <Smile
                      size={iconSize(20)}
                      color={COLORS.textBase}
                      strokeWidth={1.8}
                    />
                  </TouchableOpacity>
                )}
                {controls.showSend && (
                  <Animated.View style={[btnAnimStyle, { flexShrink: 0 }]}>
                    <TouchableOpacity
                      accessibilityLabel="Send message"
                      accessibilityRole="button"
                      accessibilityState={{ disabled: controls.sendDisabled }}
                      activeOpacity={0.76}
                      disabled={controls.sendDisabled}
                      onPress={handleSend}
                      onPressIn={handleBtnPressIn}
                      onPressOut={handleBtnPressOut}
                      hitSlop={6}
                      style={[
                        styles.compactSendButton,
                        controls.sendDisabled && styles.sendButtonDisabled,
                      ]}
                    >
                      {anyUploading ? (
                        <ActivityIndicator color={COLORS.textWeak} size="small" />
                      ) : (
                        <ArrowUp
                          size={iconSize(19)}
                          color={controls.sendDisabled ? COLORS.textDisabled : COLORS.textInverse}
                          strokeWidth={2.5}
                        />
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                )}
              </View>
            )
          )}
        </View>
      </Animated.View>

      <ChatAttachmentPickerSheet
        ref={attachmentPickerRef}
        onCamera={handleLaunchCamera}
        onDocs={handlePickDocument}
        onAudio={handlePickAudio}
        onConfirm={handleAddPickerAssets}
      />

      <EmojiPickerSheet
        ref={emojiPickerRef}
        onSelectEmoji={handleSelectEmoji}
      />
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  floatingContainer: {
    backgroundColor: COLORS.fillWeaker,
    borderWidth: 1,
    borderColor: COLORS.strokeWeak,
    overflow: 'hidden',
  },

  // Composer shape variants
  compactComposer: {
    flexDirection: 'column',
    justifyContent: 'center',
    borderRadius: INPUT_PILL_RADIUS,
    paddingHorizontal: INPUT_PILL_INSET,
    minHeight: INPUT_PILL_HEIGHT,
  },
  compactComposerWithContent: {
    borderRadius: COMPACT_COMPOSER_CONTENT_RADIUS,
  },
  expandedComposer: {
    borderRadius: radius(24),
    paddingTop: responsiveSpace(8),
    paddingHorizontal: responsiveSpace(10),
    paddingBottom: responsiveSpace(6),
    gap: responsiveSpace(4),
  },

  // Asset strip
  assetStrip: {
    flexGrow: 0,
  },
  assetStripContent: {
    gap: responsiveSpace(8),
    paddingRight: responsiveSpace(8),
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
    borderRadius: radius(10),
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
    borderRadius: radius(10),
    backgroundColor: COLORS.fillWeaker,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetFileTile: {
    width: '100%',
    height: '100%',
    borderRadius: radius(10),
    backgroundColor: COLORS.fillWeaker,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetRemoveButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 2,
    width: ms(22, 0.2),
    height: ms(22, 0.2),
    borderRadius: radius(11),
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

  // Input row
  inputRow: {
    gap: INPUT_PILL_GAP,
  },
  inputRowCompact: {
    flexDirection: 'row',
    minHeight: INPUT_PILL_HEIGHT,
    alignItems: 'center',
    width: '100%',
  },
  inputRowExpanded: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: responsiveSpace(4),
  },

  // Plus button
  plusButton: {
    width: SECONDARY_ACTION_SIZE,
    height: SECONDARY_ACTION_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    flexShrink: 0,
  },
  plusIconSurface: {
    width: PLUS_ICON_SURFACE_SIZE,
    height: PLUS_ICON_SURFACE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  plusIconSurfaceEmpty: {
    borderRadius: PLUS_ICON_EMPTY_RADIUS,
  },
  plusIconSurfaceActive: {
    borderRadius: PLUS_ICON_EMPTY_RADIUS,
  },

  // Text wrap
  textWrap: {
    justifyContent: 'center',
  },
  textWrapCompact: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  textWrapExpanded: {
    width: '100%',
  },
  expandedBottomToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: responsiveSpace(2),
  },
  recordingInputWrap: {
    borderRadius: radius(18),
    backgroundColor: COLORS.brandSubtle,
    paddingHorizontal: responsiveSpace(8),
    paddingVertical: responsiveSpace(4),
  },

  // Shared text input base
  sharedTextInput: {
    ...TYPE.label,
    color: COLORS.textStrong,
  },

  // Compact variant
  compactTextInput: {
    width: '100%',
    paddingVertical: 0,
    minHeight: COMPACT_TEXT_MIN_HEIGHT,
    textAlignVertical: 'center',
    justifyContent: 'center',
  },
  compactTextInputMultiline: {
    paddingTop: responsiveSpace(6),
    paddingBottom: responsiveSpace(6),
    textAlignVertical: 'top',
  },

  // Expanded variant
  expandedTextInput: {
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: responsiveSpace(2),
    minHeight: EXPANDED_TEXT_MIN_HEIGHT,
    textAlignVertical: 'top',
  },

  // Recording text tint
  recordingTextInput: {
    backgroundColor: COLORS.brandSubtle,
    borderRadius: radius(14),
    paddingHorizontal: responsiveSpace(8),
  },

  // Action button variants
  compactActionRow: {
    flexDirection: 'row',
    gap: INPUT_PILL_GAP,
    alignItems: 'center',
    flexShrink: 0,
  },
  compactMicButton: {
    backgroundColor: 'transparent',
    height: SECONDARY_ACTION_SIZE,
    width: SECONDARY_ACTION_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  compactEmojiButton: {
    backgroundColor: 'transparent',
    height: SECONDARY_ACTION_SIZE,
    width: SECONDARY_ACTION_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  compactSendButton: {
    width: PRIMARY_ACTION_SIZE,
    height: PRIMARY_ACTION_SIZE,
    borderRadius: ACTION_SQUIRCLE_RADIUS,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
    flexShrink: 0,
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
    flexShrink: 0,
  },
  expandedSendButton: {
    width: EXPANDED_ACTION_SIZE,
    height: EXPANDED_ACTION_SIZE,
    borderRadius: ACTION_SQUIRCLE_RADIUS,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.fillWeak,
    elevation: 0,
    shadowOpacity: 0,
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

// Link the forward-declared reference so MemoAttachmentTile can use the same StyleSheet
chatInputStyles = styles;
