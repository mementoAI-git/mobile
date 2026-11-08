import { PublishSheetHeader } from '@/components/editor/PublishSheetHeader';
import { PublishSuccessView } from '@/components/editor/PublishSuccessView';
import { hasMeaningfulStoryBodyContent } from '@/features/editor/story-content';
import { useThemeColors } from '@/hooks/use-theme-colors';
/**
 * app/editor.tsx — Unified compose screen
 *
 * mode=story         → long-form article editor (title + body, publish flow)
 * mode=quick-capture → quick note + attachments (body only, quick-capture API)
 *
 * Mode is a URL param — switching uses router.setParams() which mutates the
 * current route in-place with NO animation. Only the first open from outside
 * slides up (fullScreenModal presentation).
 */
import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Image,
  ActivityIndicator,
  Keyboard,
  DeviceEventEmitter,
} from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { SafeAreaView, SafeAreaInsetsContext, SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModalSafeAreaBoundary } from '@/components/system/NativeModalSafeAreaBoundary';
import MoreHorizontal from 'lucide-react-native/icons/ellipsis';
import X from 'lucide-react-native/icons/x';
import Users from 'lucide-react-native/icons/users';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Lock from 'lucide-react-native/icons/lock';
import FileText from 'lucide-react-native/icons/file-text';
import Play from 'lucide-react-native/icons/play';
import Camera from 'lucide-react-native/icons/camera';
import Mic from 'lucide-react-native/icons/mic';
import Video from 'lucide-react-native/icons/video';
import Music from 'lucide-react-native/icons/music';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as ExpoCamera from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import Animated, { FadeIn, FadeOut, FadeInDown } from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { CAPTURE_HANDED_OFF_EVENT, parseStoryHandoff, type CaptureHandedOffEvent } from '@/features/overview/capture-draft';
import { minTouchTarget, radius, iconSize } from '@/constants/responsive';
import {
  getDraftButtonDotColor,
  isMeaningfulDraftContent,
  type AutosaveStatus,
} from '@/features/editor/autosave';
import { useUserStore } from '@/store';
import { useCreateMemory, useUpdateMemory } from '@/hooks/mutations/use-memory-mutations';
import { useQuickCapture } from '@/hooks/mutations/use-quick-capture';
import { useFileUpload } from '@/hooks/mutations/use-file-upload';
import { useGroups } from '@/hooks/queries/use-groups';
import { useMemoriesStats } from '@/hooks/queries/use-memories';
import { celebrateFirstStory, isFirstStory } from '@/features/ceremony/first-story';
import { useStoryRecording } from '@/hooks/use-story-recording';
import { Button } from '@/components/ui/Button';
import { StoryRecordingPanel } from '@/components/editor/StoryRecordingPanel';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import { extractUrls } from '@/hooks/use-link-preview';
import { useToast, ToastViewport } from '@/components/ui/Toast';
import { BottomSheetModal, BottomSheetView, BottomSheetModalProvider, BottomSheetScrollView, BottomSheetTextInput, type BottomSheetHandleProps } from '@gorhom/bottom-sheet';
import { upsertDraft, saveLocalDraft, loadDrafts, readLocalDrafts, deleteDraft, DraftsSheet, type StoryDraft, type StoryDraftAttachment } from '@/components/sheets/DraftsSheet';
import { File, Paths, Directory } from 'expo-file-system';
import { saveDraftAndExit, snapshotEditorBody } from '@/features/editor/exit-editor';
import { toStoryDraftAttachments } from '@/features/editor/draft-attachments';
import { useUiStore } from '@/store';
import { EditorActionBar } from '@/components/ui/EditorActionBar';
import { MediaPreviewModal } from '@/components/ui/MediaPreviewModal';
import { CameraCaptureModal } from '@/components/ui/CameraCaptureModal';
import { RecordingStatus } from '@/components/ui/RecordingStatus';
import { useVoiceTextField } from '@/features/voice-control/hooks';
import { plainTextToStoryHtml, storyHtmlToPlainText } from '@/features/voice-control/story-text';
import { StoryRichEditor, FormattingToolbar, type StoryRichEditorRef } from '@/components/ui/StoryRichEditor';
import { StoryComposerBackdrop } from '@/components/editor/StoryComposerBackdrop';
import { LinkPreviews } from '@/components/ui/LinkPreview';
import type { EditorBridge } from '@10play/tentap-editor';
import client from '@/api/client';
import endpoint from '@/api/endpoint';
import type { IFile } from '@/types';
import { PublishPrivacySheet, type PrivacyMode } from '@/components/sheets/PublishPrivacySheet';
import { deriveMemoryAudience, formatMemoryAudienceLabel, normalizeAudienceIds, type MemoryAudienceSelection, type MemoryVisibility } from '@/features/memories/memory-audience';
import { buildEditorPublishPayload } from '@/features/editor/editor-publish-payload';
import { singleLineTitle } from '@/features/editor/title-input';
import { publishedPostUrl } from '@/lib/env';
import { isPermissionGranted, type PermissionLike } from '@/lib/permission-recovery';
import { showPermissionRecoveryAlert } from '@/lib/show-permission-recovery-alert';
import { getSheetBottomPadding } from '@/features/layout/sheet-safe-area';
import {
  DOCUMENT_PICKER_MIME_TYPES,
  MAX_ATTACHMENT_FILE_MB,
  getDocumentUploadInput,
  getMediaUploadInput,
  isFileTooLarge,
} from '@/features/media/attachments';
import {
  getUploadedAttachmentIds,
  hasUploadingAttachments,
  type UploadAttachment,
} from '@/features/media/attachment-upload-state';
import { useAttachmentUploads } from '@/features/media/use-attachment-uploads';
import { useSheetChrome } from '@/components/sheets/use-sheet-chrome';

// ─── Constants ────────────────────────────────────────────────────────────────

const STORY_DRAFT_KEY = (email?: string | null) => `article_draft_${email ?? 'anon'}`;
const QC_DRAFT_KEY = (email?: string | null) => `qc_draft_${email ?? 'anon'}`;
const NOTE_CHAR_MAX = 8000;
const FILE_INPUT_MIME = DOCUMENT_PICKER_MIME_TYPES;


// ─── Types ────────────────────────────────────────────────────────────────────

type AttachmentItem = UploadAttachment<IFile>;

// ─── Publish modal (story mode) ───────────────────────────────────────────────

function PublishModalInner({
  title,
  body,
  attachmentIds,
  onClose,
  onComplete,
  onPublished,
  memoryId,
  draftId,
  userEmail,
  initialTags,
  initialBeneficiaryIds,
  initialGroupIds,
  initialVisibility,
}: {
  title: string;
  body: string;
  attachmentIds: string[];
  onClose: () => void;
  onComplete: () => void;
  onPublished: (url: string, memoryId: string) => void;
  memoryId?: string;
  draftId?: string;
  userEmail?: string | null;
  initialTags?: string;
  initialBeneficiaryIds?: string[];
  initialGroupIds?: string[];
  initialVisibility?: MemoryVisibility;
}) {
  const COLORS = useThemeColors();
  const insets = useSafeAreaInsets();
  const [tags, setTags] = useState(initialTags ?? '');
  const [audience, setAudience] = useState<MemoryAudienceSelection>(() => deriveMemoryAudience({ visibility: initialVisibility, beneficiaries: initialBeneficiaryIds, groups: initialGroupIds }));
  const privacySheetRef = useRef<BottomSheetModal>(null);
  const [isAutotagging, setIsAutotagging] = useState(false);

  const isCloudDraft = !!draftId && !draftId.startsWith('draft_');
  const targetMemoryId = memoryId || (isCloudDraft ? draftId : undefined);
  const isExistingStory = !!memoryId;
  const isEditMode = !!targetMemoryId;

  const { mutate: createMemory, isPending: createPending } = useCreateMemory();
  const { mutate: updateMemory, isPending: updatePending } = useUpdateMemory(targetMemoryId ?? '');
  const isPending = isEditMode ? updatePending : createPending;
  const { toast } = useToast();

  const privacyLabel = useMemo(() => formatMemoryAudienceLabel(audience), [audience]);

  const handleAutotag = useCallback(async () => {
    const bodyText = [title, body].filter(Boolean).join(' ').trim();
    if (!bodyText) return;
    setIsAutotagging(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await client.post(endpoint.generateTags, { body: bodyText });
      const generated: string[] = res.data?.data?.tags ?? res.data?.tags ?? [];
      if (generated.length) {
        setTags(prev => {
          const existing = prev.split(',').map(t => t.trim()).filter(Boolean);
          return [...new Set([...existing, ...generated])].join(', ');
        });
      }
    } catch { toast('Could not generate tags', 'error'); }
    finally { setIsAutotagging(false); }
  }, [title, body, toast]);

  const handlePrivacyModeChange = useCallback((mode: PrivacyMode) => {
    setAudience((current) => ({ ...current, mode: mode === 'all' ? 'everyone' : mode }));
  }, []);

  const handleOpenPrivacySheet = useCallback(() => {
    Haptics.selectionAsync();
    Keyboard.dismiss();
    requestAnimationFrame(() => privacySheetRef.current?.present());
  }, []);

  const handleToggleBeneficiary = useCallback((id: string) => {
    setAudience((current) => ({ ...current, beneficiaryIds: current.beneficiaryIds.includes(id) ? current.beneficiaryIds.filter(value => value !== id) : [...current.beneficiaryIds, id] }));
  }, []);

  const handleToggleGroup = useCallback((id: string) => {
    setAudience((current) => ({ ...current, groupIds: current.groupIds.includes(id) ? current.groupIds.filter(value => value !== id) : [...current.groupIds, id] }));
  }, []);

  const handlePost = useCallback(() => {
    if (!title.trim() && !body.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const tagList = tags.split(/[,\s]+/).map(t => t.trim()).filter(Boolean);
    const payload = buildEditorPublishPayload({ title, body, tags: tagList, attachmentIds, audience });
    const onSuccess = (res: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (isExistingStory) {
        // Editing an already-published story: show success toast and close
        toast('Story updated.', 'success');
        onComplete();
      } else {
        // Brand new story or promoted cloud draft
        if (draftId) {
          // Remove local draft slot without issuing a remote delete for the promoted memory
          void deleteDraft(userEmail, draftId, { skipRemote: true })
            .then((drafts) => useUiStore.getState().setStoryDrafts(drafts))
            .catch(() => undefined);
        }
        const id = res?.data?._id ?? res?.data?.data?._id ?? targetMemoryId ?? '';
        onPublished(publishedPostUrl(id), id);
      }
    };
    const onError = (err: any) => toast(err?.message ?? 'Could not publish. Try again.', 'error');

    if (isEditMode) {
      updateMemory(payload, { onSuccess, onError });
    } else {
      createMemory(payload, { onSuccess, onError });
    }
  // attachmentIds must be in deps — without it the closure captures the initial
  // empty array and voice notes / images added before publishing are silently dropped.
  }, [title, body, tags, attachmentIds, audience, isExistingStory, isEditMode, targetMemoryId, createMemory, updateMemory, toast, onComplete, onPublished, draftId, userEmail]);

    return (
      <>
        <BottomSheetScrollView
          style={{ backgroundColor: COLORS.background }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 32, gap: 32, paddingBottom: Math.max(insets.bottom + 24, 32) }}
        >
              {/* Body: visibility and tags share one 24px section rhythm. */}
              <View style={{ gap: 24 }}>
              <View style={{ backgroundColor: COLORS.fillWeak, borderRadius: 16, padding: 16 }}>
                <Text style={{ ...TYPE.body, color: COLORS.textStrong, marginBottom: 4 }}>Who can see this story?</Text>
                <Text style={{ ...TYPE.bodySmall, color: COLORS.textBase, marginBottom: 14 }}>New stories are private unless you choose otherwise.</Text>
                <TouchableOpacity
                  onPress={handleOpenPrivacySheet}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1, borderColor: COLORS.strokeWeaker }}
                  activeOpacity={0.8}
                >
                  <Users size={18} color={COLORS.textBase} strokeWidth={1.8} />
                  <Text style={{ flex: 1, ...TYPE.label, color: COLORS.textStrong }}>{privacyLabel}</Text>
                  <ChevronDown size={16} color={COLORS.textMuted} strokeWidth={2} />
                </TouchableOpacity>
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ ...TYPE.body, color: COLORS.textStrong }}>Tags (optional)</Text>
                  <TouchableOpacity onPress={handleAutotag} disabled={isAutotagging} activeOpacity={0.8}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: `${COLORS.info}40`, backgroundColor: `${COLORS.info}08` }}>
                    {isAutotagging ? <ActivityIndicator size="small" color={COLORS.info} /> : <Sparkles size={13} color={COLORS.info} strokeWidth={2} />}
                    <Text style={{ ...TYPE.metadata, color: COLORS.info }}>Autotag</Text>
                  </TouchableOpacity>
                </View>
                <BottomSheetTextInput value={tags} onChangeText={setTags} placeholder="Add tags if you like" placeholderTextColor={COLORS.textMuted} returnKeyType="done"
                  style={{ backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.strokeWeaker, paddingHorizontal: 14, paddingVertical: 14, ...TYPE.label, color: COLORS.textStrong, minHeight: 50 }} />
                <Text style={{ ...TYPE.metadata, color: COLORS.textWeak, marginTop: 8 }}>Relevant tags will be added in the background if you leave this blank.</Text>
              </View>
              </View>
              {/* Actions are separated from the body by the 32px container gap. */}
              <View>
              <TouchableOpacity onPress={handlePost} activeOpacity={0.85} disabled={(!title.trim() && !body.trim()) || isPending}
                style={[{ height: 56, borderRadius: 999, backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center' }, ((!title.trim() && !body.trim()) || isPending) && { opacity: 0.45 }]}>
                {isPending ? <ActivityIndicator color={COLORS.textInverse} /> : <Text style={{ ...TYPE.button, color: COLORS.textInverse }}>Post now</Text>}
              </TouchableOpacity>
              </View>
        </BottomSheetScrollView>
      <PublishPrivacySheet
        ref={privacySheetRef}
        mode={audience.mode === 'everyone' ? 'all' : audience.mode}
        selectedBeneficiaryIds={audience.beneficiaryIds}
        selectedGroupIds={audience.groupIds}
        onModeChange={handlePrivacyModeChange}
        onToggleBeneficiary={handleToggleBeneficiary}
        onToggleGroup={handleToggleGroup}
        onApply={(nextMode, nextBeneficiaryIds, nextGroupIds) => {
          setAudience({ mode: nextMode === 'all' ? 'everyone' : nextMode, beneficiaryIds: nextBeneficiaryIds, groupIds: nextGroupIds });
        }}
        onClose={() => privacySheetRef.current?.dismiss()}
      />
      </>
  );
}

// ─── Main Editor Screen ───────────────────────────────────────────────────────

export default function EditorScreen() {
  const COLORS = useThemeColors();
  const sheetChrome = useSheetChrome();
  const router = useRouter();
  const { mode: rawMode, memoryId, initialData, lockMode, initialDraft, autoRecord } = useLocalSearchParams<{
    mode?: string; memoryId?: string; initialData?: string; lockMode?: string;
    /** Overview capture card "Use as story" handoff (new stories only). */
    initialDraft?: string;
    /** Overview capture card mic: start recording as soon as the page is ready. */
    autoRecord?: string;
  }>();
  const mode = (rawMode === 'quick-capture' ? 'quick-capture' : 'story') as 'story' | 'quick-capture';
  const isStory = mode === 'story';
  const isEditing = !!memoryId;
  const showComposerPaper = isStory && !isEditing;

  const user = useUserStore(s => s.user);
  const { data: memoriesStats } = useMemoriesStats();
  // The person's first story, celebrated once the success page closes.
  const firstStoryRef = useRef<{ memoryId: string; title: string } | null>(null);

  const initialParsedData = useMemo(() => {
    if (isEditing && initialData) {
      try {
        return JSON.parse(decodeURIComponent(initialData));
      } catch {}
    }
    return null;
  }, [isEditing, initialData]);

  const initialTags = useMemo(() => {
    if (initialParsedData?.tags && Array.isArray(initialParsedData.tags)) {
      return initialParsedData.tags.join(', ');
    }
    return '';
  }, [initialParsedData]);

  const initialBeneficiaryIds = useMemo(() => {
    if (initialParsedData?.beneficiaries && Array.isArray(initialParsedData.beneficiaries)) {
      return normalizeAudienceIds(initialParsedData.beneficiaries);
    }
    return [];
  }, [initialParsedData]);

  const initialGroupIds = useMemo(() => {
    if (initialParsedData?.groups && Array.isArray(initialParsedData.groups)) {
      return normalizeAudienceIds(initialParsedData.groups);
    }
    return [];
  }, [initialParsedData]);

  const titleRef = useRef<TextInput>(null);
  const bodyRef = useRef<TextInput>(null);
  const richEditorRef = useRef<StoryRichEditorRef>(null);
  const isMountedRef = useRef(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitingRef = useRef(false);
  // Set when this story came from the Overview capture card, so the card can let go of it.
  const handoffIdRef = useRef<string | null>(null);
  const emitHandedOff = useCallback((outcome: CaptureHandedOffEvent['outcome']) => {
    const handoffId = handoffIdRef.current;
    if (!handoffId) return;
    handoffIdRef.current = null;
    DeviceEventEmitter.emit(CAPTURE_HANDED_OFF_EVENT, { handoffId, outcome } satisfies CaptureHandedOffEvent);
  }, []);

  // Multi-draft: each new story session gets its own id so up to 10 drafts can coexist
  const draftIdRef = useRef<string>(isEditing ? '' : `draft_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  // Refs to track latest title/body synchronously — avoids stale closure in Cancel handler
  const latestTitleRef = useRef('');
  const latestBodyRef = useRef('');
  // currentDraftId mirrors draftIdRef as state so PublishModal always receives the live value
  const [currentDraftId, setCurrentDraftId] = useState(draftIdRef.current);
  const setStoryDrafts = useUiStore((s) => s.setStoryDrafts);
  // Incrementing this key forces StoryRichEditor to fully remount (blank WebView)
  const [editorInstanceKey, setEditorInstanceKey] = useState(0);

  // Story state
  const [title, setTitle] = useState('');
  const [storyBody, setStoryBody] = useState('');
  const [storyLinkText, setStoryLinkText] = useState('');
  useEffect(() => { setStoryLinkText(extractUrls(storyBody).join('\n')); }, [storyBody]);
  const [dismissedLinks, setDismissedLinks] = useState<string[]>([]);
  const applyDictation = useCallback(async (text: string) => {
    if (isStory) {
      const editor = richEditorRef.current;
      if (!editor) throw new Error('The editor is not ready. Your recording is saved for retry.');
      const body = await editor.insertDictation(text);
      if (!isMountedRef.current) throw new Error('The editor closed. Your recording is saved for retry.');
      latestBodyRef.current = body;
      setStoryBody(body);
      storyHasContentRef.current = hasMeaningfulStoryBodyContent(body);
      setStoryHasContent(storyHasContentRef.current);
    } else setQcBody(previous => [previous, text].filter(Boolean).join(' '));
  }, [isStory]);
  const [storyHasContent, setStoryHasContent] = useState(false);
  const storyHasContentRef = useRef(false);
  const [savedStatus, setSavedStatus] = useState<'saved'|'saving'|'unsaved'>('saved');
  const [showPublish, setShowPublish] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [editorBridge, setEditorBridge] = useState<EditorBridge | null>(null);
  const handleBridgeReady = useCallback((bridge: EditorBridge) => setEditorBridge(bridge), []);

  // Quick-capture state
  const [qcBody, setQcBody] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  // Shared
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);

  // Local DraftsSheet — bypasses global SheetManager so it renders inside this
  // fullScreenModal native window on iOS (not behind it in the tabs window).
  // Props are injected into the global sheetProps store so DraftsSheet can read them,
  // but we present via a local BottomSheetModal ref rather than the global SheetManager.
  const draftsSheetRef = useRef<BottomSheetModal>(null);
  const publishSheetRef = useRef<BottomSheetModal>(null);
  const pendingPublishedUrlRef = useRef<string | null>(null);

  const { mutate: createMemory } = useCreateMemory();
  const { mutateAsync: quickCapture, isPending: qcPending } = useQuickCapture();
  const { mutateAsync: uploadFileMutation } = useFileUpload();
  const { toast } = useToast();
  const {
    attachments,
    setAttachments,
    uploadAndAdd,
  } = useAttachmentUploads<IFile>({
    uploadFile: uploadFileMutation,
    insert: 'prepend',
    isMountedRef,
    onUploadFailure: () => {
      toast('Failed to upload attachment', 'error');
    },
  });
  const handleMicrophonePermissionDenied = useCallback((permission: PermissionLike) => {
    showPermissionRecoveryAlert({
      permission,
      title: 'Microphone is off',
      description: 'Allow microphone access to record your story.',
      settingsDescription: 'Microphone access is turned off in Settings. Turn it back on to record your story.',
    });
  }, []);
  const { start: startRecording, stop: stopRecording, cancel: cancelRecording, retry: retryRecording,
    discard: discardRecording, isRecording: isCapturing, isStarting, isTranscribing, canRetry, error: dictationError,
    levels: recordingLevels, duration: recDuration } = useStoryRecording({
    owner: user?.email || 'local',
    onTranscript: applyDictation,
    onPermissionDenied: handleMicrophonePermissionDenied,
  });
  const isRecording = isCapturing || isStarting;
  const handleCancelDictation = useCallback(() => {
    Haptics.selectionAsync();
    void cancelRecording();
  }, [cancelRecording]);
  const handleStopDictation = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void stopRecording();
  }, [stopRecording]);

  useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }; }, []);

  // Load drafts / pre-populate from edit params; also refresh draft count badge
  useEffect(() => {
    if (isEditing && initialData) {
      // Edit mode — decode full memory JSON seeded by handleEdit
      try {
        const d = JSON.parse(decodeURIComponent(initialData));
        if (d.title) setTitle(d.title);
        if (d.body) {
          setStoryBody(d.body);
          latestBodyRef.current = d.body;
          const hasContent = hasMeaningfulStoryBodyContent(d.body);
          storyHasContentRef.current = hasContent;
          setStoryHasContent(hasContent);
        }
        // Seed existing attachments — already on server, no re-upload needed
        if (Array.isArray(d.attachments) && d.attachments.length) {
          setAttachments(d.attachments.map((a: any) => ({
            clientId: a.id || `existing_${Math.random().toString(36).slice(2)}`,
            fileId: a.id || '',
            uri: a.url || '',
            name: a.name || '',
            mimeType: a.type || 'image/jpeg',
            isUploading: false,
          })));
        }
      } catch { /* ignore malformed JSON */ }
      setIsDraftLoaded(true);
    } else if (!isEditing) {
      // Seed a new story handed over from the Overview capture card.
      const handoff = parseStoryHandoff(initialDraft);
      if (handoff) {
        handoffIdRef.current = handoff.handoffId;
        if (handoff.body) {
          setStoryBody(handoff.body);
          latestBodyRef.current = handoff.body;
          const hasContent = hasMeaningfulStoryBodyContent(handoff.body);
          storyHasContentRef.current = hasContent;
          setStoryHasContent(hasContent);
        }
        if (handoff.attachments.length) {
          setAttachments(handoff.attachments.map((a: any) => ({
            clientId: a.id || `handoff_${Math.random().toString(36).slice(2)}`,
            fileId: a.id || '',
            uri: a.url || '',
            name: a.name || '',
            mimeType: a.type || 'audio/m4a',
            isVoice: Boolean(a.isVoice),
            duration: a.duration,
            isUploading: false,
          })));
        }
      }
      // Load QC draft and refresh the draft count badge in parallel
      Promise.all([
        loadDrafts(user?.email).then(d => {
          if (isMountedRef.current) setStoryDrafts(d);
        }),
        Promise.resolve()
      ]).finally(() => {
        if (isMountedRef.current) setIsDraftLoaded(true);
      });
    }
    const t = setTimeout(() => { (isStory ? titleRef : bodyRef).current?.focus(); }, 200);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave story draft — upserts into the multi-draft array (max 10)
  const scheduleSave = useCallback((t: string, b: string) => {
    if (isEditing) return; // Never autosave when editing an existing published story
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSavedStatus('saving');
    saveTimerRef.current = setTimeout(async () => {
      if (!isMeaningfulDraftContent(t, b) && attachments.length === 0) {
        // Empty — remove this draft slot silently
        if (draftIdRef.current) {
          const drafts = await deleteDraft(user?.email, draftIdRef.current).catch(() => null);
          if (drafts && isMountedRef.current) setStoryDrafts(drafts);
        }
        if (isMountedRef.current) setSavedStatus('saved');
        return;
      }
      try {
        // Snapshot already-uploaded attachments so they can be restored on load
        const savedAttachments = toStoryDraftAttachments(attachments);

        const savedId = await upsertDraft(user?.email, {
          id: draftIdRef.current,
          title: t,
          body: b,
          updatedAt: Date.now(),
          attachments: savedAttachments.length ? savedAttachments : undefined,
        });
        if (isMountedRef.current) {
          if (savedId) {
            draftIdRef.current = savedId;
            setCurrentDraftId(savedId);
          }
          setSavedStatus('saved');
          // Refresh the badge from the device copy; no need to download the list.
          readLocalDrafts(user?.email).then(d => {
            if (isMountedRef.current) setStoryDrafts(d);
          });
        }
      } catch {
        if (isMountedRef.current) setSavedStatus('unsaved');
      }
    }, 1200);
  }, [user?.email, isEditing, attachments]);

  const handleImagePicker = useCallback(async () => {
    Haptics.selectionAsync();
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!isPermissionGranted(permission)) {
      showPermissionRecoveryAlert({
        permission,
        title: 'Media is tucked away',
        description: 'Allow photo and video access to attach media to this memory.',
        settingsDescription: 'Photo and video access is turned off in Settings. Turn it back on to attach media to this memory.',
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsMultipleSelection: true, quality: 0.85 });
    if (!result.canceled) await Promise.all(result.assets.map((a) => {
      const upload = getMediaUploadInput(a);
      return uploadAndAdd(upload.uri, upload.mimeType, upload.name);
    }));
  }, [uploadAndAdd]);

  // Camera button — opens the CameraCaptureModal which supports both photo
  // and video recording via expo-camera's CameraView. The modal handles its
  // own permissions and calls onCapture once the user snaps or records.
  const handleOpenCamera = useCallback(() => {
    Haptics.selectionAsync();
    setCameraVisible(true);
  }, []);

  const handleCameraCapture = useCallback(async (uri: string, mimeType: string, fileName: string) => {
    setCameraVisible(false);
    await uploadAndAdd(uri, mimeType, fileName);
  }, [uploadAndAdd]);

  const handleAudioFile = useCallback(async () => {
    Haptics.selectionAsync();
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: FILE_INPUT_MIME, copyToCacheDirectory: true });
      if (!result.canceled && result.assets[0]) {
        const upload = getDocumentUploadInput(result.assets[0]);
        if (isFileTooLarge(upload.fileSize)) { toast(`File exceeds ${MAX_ATTACHMENT_FILE_MB}MB limit`, 'error'); return; }
        await uploadAndAdd(upload.uri, upload.mimeType, upload.name);
      }
    } catch {}
  }, [uploadAndAdd, toast]);

  const handleVoice = useCallback(async () => {
    Haptics.selectionAsync();
    if (isRecording) { await stopRecording(); return; }
    if (isTranscribing) return;
    if (canRetry) { await retryRecording(); return; }
    if (isStory) richEditorRef.current?.beginDictation();
    editorBridge?.blur();
    Keyboard.dismiss();
    await startRecording();
  }, [isRecording, stopRecording, isTranscribing, canRetry, retryRecording, editorBridge, isStory, startRecording]);

  // The Overview mic opens this page and records here, exactly as the toolbar mic does.
  const autoRecordStartedRef = useRef(false);
  useEffect(() => {
    if (autoRecord !== 'true' || autoRecordStartedRef.current) return;
    if (!isStory || isEditing || !isDraftLoaded || !editorBridge) return;
    autoRecordStartedRef.current = true;
    void handleVoice();
  }, [autoRecord, isStory, isEditing, isDraftLoaded, editorBridge, handleVoice]);

  const attachmentGroups = useMemo(() => {
    const mediaAttachments: AttachmentItem[] = [];
    const voiceAttachments: AttachmentItem[] = [];
    const documentAttachments: AttachmentItem[] = [];

    for (const attachment of attachments) {
      if (attachment.mimeType.startsWith('image/') || attachment.mimeType.startsWith('video/')) {
        mediaAttachments.push(attachment);
      } else if (attachment.isVoice) {
        voiceAttachments.push(attachment);
      } else {
        documentAttachments.push(attachment);
      }
    }

    return {
      anyUploading: hasUploadingAttachments(attachments),
      uploadedIds: getUploadedAttachmentIds(attachments),
      mediaAttachments,
      voiceAttachments,
      documentAttachments,
    };
  }, [attachments]);
  const { anyUploading, uploadedIds, mediaAttachments, voiceAttachments, documentAttachments } = attachmentGroups;

  const handleRemoveAttachment = useCallback((clientId: string) => {
    Haptics.selectionAsync();
    setAttachments(prev => prev.filter(x => x.clientId !== clientId));
  }, []);

  const handleOpenAttachmentPreview = useCallback((idx: number) => {
    Haptics.selectionAsync();
    setPreviewIndex(idx);
    setPreviewVisible(true);
  }, []);

  const handleSave = useCallback(async () => {
    setSaveError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await quickCapture({ body: qcBody.trim(), visibility: 'private', attachments: uploadedIds.length ? uploadedIds : undefined });
      AsyncStorage.removeItem(QC_DRAFT_KEY(user?.email)).catch(() => {});
      toast('Got it. Processing in the background…', 'success');
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/overview');
      }
    } catch (err: any) { setSaveError(err?.message ?? 'Could not save. Try again.'); }
  }, [quickCapture, qcBody, router, uploadedIds, user?.email, toast]);

  useEffect(() => {
    if (isDraftLoaded && !isEditing && !exitingRef.current) scheduleSave(latestTitleRef.current, latestBodyRef.current);
  }, [attachments, scheduleSave, isDraftLoaded, isEditing]);

  // Stable onChange for StoryRichEditor — avoids recreating the bridge on every render
  // Keep autosave and URL previews current without rerendering for every body edit.
  const handleStoryBodyChange = useCallback((v: string) => {
    latestBodyRef.current = v;
    const links = extractUrls(v).join('\n');
    setStoryLinkText(previous => previous === links ? previous : links);
    scheduleSave(latestTitleRef.current, v);

    // Only update content state when transitioning (has content vs no content)
    const hasContent = hasMeaningfulStoryBodyContent(v);
    if (hasContent !== storyHasContentRef.current) {
      storyHasContentRef.current = hasContent;
      setStoryHasContent(hasContent);
    }
  }, [scheduleSave]);
  const storyCanContinue = Boolean(title.trim()) || storyHasContent || uploadedIds.length > 0;
  // Voice can read and type the title, the story and a quick note, so the
  // host sees the words appear here instead of on another screen.
  const handleTitleChange = useCallback((raw: string) => {
    const v = singleLineTitle(raw);
    setTitle(v);
    latestTitleRef.current = v;
    scheduleSave(v, latestBodyRef.current);
  }, [scheduleSave]);
  const writeStoryByVoice = useCallback((text: string) => {
    const html = plainTextToStoryHtml(text);
    richEditorRef.current?.setContent(html);
    handleStoryBodyChange(html);
  }, [handleStoryBodyChange]);
  const readStoryForVoice = useCallback(() => storyHtmlToPlainText(latestBodyRef.current), []);
  useVoiceTextField(isStory ? 'title' : undefined, title, handleTitleChange);
  useVoiceTextField(isStory ? 'story' : undefined, readStoryForVoice, writeStoryByVoice);
  useVoiceTextField(
    isStory ? undefined : 'note',
    qcBody,
    (v) => setQcBody(v.slice(0, NOTE_CHAR_MAX)),
  );

  // Static test assertion: const storyHasContent = hasMeaningfulStoryBodyContent(storyBody);
  const qcHasContent = qcBody.trim().length > 0 || uploadedIds.length > 0;
  const canSave = qcHasContent && !anyUploading && !qcPending && !isRecording;

  // Track saved QC draft for restore button
  const [savedQcBody, setSavedQcBody] = useState('');
  useEffect(() => {
    AsyncStorage.getItem(QC_DRAFT_KEY(user?.email)).then(raw => {
      if (!raw) return;
      try { const d = JSON.parse(raw); if (d.body) setSavedQcBody(d.body); } catch {}
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const hasQcDraft = savedQcBody.trim().length > 0 && savedQcBody !== qcBody;
  const draftDotColor = getDraftButtonDotColor(savedStatus, isMeaningfulDraftContent(title, storyBody), COLORS);

  const handleOpenPublishSheet = useCallback(() => {
    setStoryBody(latestBodyRef.current);
    editorBridge?.blur();
    Keyboard.dismiss();
    setShowPublish(true);
    publishSheetRef.current?.present();
  }, [editorBridge]);

  const handleClosePublishSheet = useCallback(() => {
    pendingPublishedUrlRef.current = null;
    setShowPublish(false);
    publishSheetRef.current?.dismiss();
  }, []);

  const renderPublishHeader = useCallback((props: BottomSheetHandleProps) => (
    <PublishSheetHeader {...props} onClose={handleClosePublishSheet} />
  ), [handleClosePublishSheet]);

  const handlePublishFlowComplete = useCallback(() => {
    pendingPublishedUrlRef.current = null;
    setShowPublish(false);
    publishSheetRef.current?.dismiss();
    if (isEditing) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/stories');
      }
    } else {
      setTitle('');
      setStoryBody('');
      latestTitleRef.current = '';
      latestBodyRef.current = '';
      storyHasContentRef.current = false;
      setStoryHasContent(false);
      setAttachments([]);
      setSavedStatus('saved');
      const newId = `draft_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      draftIdRef.current = newId;
      setCurrentDraftId(newId);
      setEditorInstanceKey(k => k + 1);
      if (lockMode === 'true' || !router.canGoBack()) {
        router.replace('/(tabs)/stories');
      } else {
        router.back();
      }
    }
  }, [isEditing, lockMode, router, setAttachments]);

  const handleCancel = useCallback(async () => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    Haptics.selectionAsync();
    editorBridge?.blur(); Keyboard.dismiss();
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const body = isStory
      ? await snapshotEditorBody(richEditorRef.current ? () => richEditorRef.current!.getHTML() : undefined, () => latestBodyRef.current)
      : qcBody;
    const draftTitle = latestTitleRef.current || title;
    const hasContent = Boolean(draftTitle.trim()) || hasMeaningfulStoryBodyContent(body) || attachments.length > 0;
    const leave = () => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)/overview'); };
    const saved = await saveDraftAndExit({
      saveLocal: hasContent ? async () => {
        const savedAttachments = toStoryDraftAttachments(attachments);
        for (const attachment of savedAttachments) {
          if (attachment.fileId || !attachment.uri.startsWith('file:') || attachment.uri.startsWith(Paths.document.uri)) continue;
          const directory = new Directory(Paths.document, 'draft-media');
          directory.create({ idempotent: true, intermediates: true });
          const extension = attachment.uri.split('.').pop()?.split('?')[0] || 'bin';
          const savedFile = new File(directory, `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`);
          new File(attachment.uri).copy(savedFile);
          attachment.uri = savedFile.uri;
        }
        const draft: StoryDraft = { id: draftIdRef.current || `draft_${Date.now()}`, title: draftTitle, body, updatedAt: Date.now(), attachments: savedAttachments.length ? savedAttachments : undefined };
        if (isStory || attachments.length) {
          await saveLocalDraft(user?.email, draft);
          setStoryDrafts(await readLocalDrafts(user?.email));
          void upsertDraft(user?.email, draft).then(() => readLocalDrafts(user?.email)).then(drafts => useUiStore.getState().setStoryDrafts(drafts)).catch(() => {});
        } else await AsyncStorage.setItem(QC_DRAFT_KEY(user?.email), JSON.stringify({ body }));
      } : undefined,
      leave,
      notify: () => toast('Draft saved', 'success'),
      onFailure: () => toast('Could not save your draft. Please try again.', 'error'),
    });
    if (!saved) exitingRef.current = false;
    else if (hasContent && isStory) emitHandedOff('draft');
  }, [editorBridge, isStory, qcBody, attachments, router, user?.email, setStoryDrafts, toast, title, emitHandedOff]);


  const handlePublishCreated = useCallback((url: string, publishedId: string) => {
    emitHandedOff('published');
    if (!isEditing && publishedId && !firstStoryRef.current && isFirstStory(memoriesStats?.stories_count)) {
      firstStoryRef.current = { memoryId: publishedId, title: latestTitleRef.current };
    }
    pendingPublishedUrlRef.current = url;
    setShowPublish(false);
    publishSheetRef.current?.dismiss();
  }, [emitHandedOff, isEditing, memoriesStats?.stories_count]);

  const successExitingRef = useRef(false);
  const handleDismissPublishedSuccess = useCallback(() => {
    if (successExitingRef.current) return;
    successExitingRef.current = true;
    if ((!isEditing && lockMode === 'true') || !router.canGoBack()) {
      router.replace('/(tabs)/stories');
    } else {
      router.back();
    }
    // First story: the celebration sheet follows the success page.
    const firstStory = firstStoryRef.current;
    firstStoryRef.current = null;
    if (firstStory) void celebrateFirstStory({ ...firstStory, email: user?.email });
  }, [isEditing, lockMode, router, user?.email]);

  const handlePublishAddAnother = useCallback(() => {
    setPublishedUrl(null);
    setTitle('');
    setStoryBody('');
    latestTitleRef.current = '';
    latestBodyRef.current = '';
    storyHasContentRef.current = false;
    setStoryHasContent(false);
    setAttachments([]);
    setSavedStatus('saved');
    draftIdRef.current = `draft_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setCurrentDraftId(draftIdRef.current);
    setEditorInstanceKey(k => k + 1);
    setTimeout(() => titleRef.current?.focus(), 200);
  }, [setAttachments]);

  // Success owns the existing editor route: dismissing it needs only one native
  // screen transition, with no composer exposed between stacked modal closures.
  if (publishedUrl) {
    return (
      <NativeModalSafeAreaBoundary>
        <PublishSuccessView
          publishedUrl={publishedUrl}
          onAddAnother={lockMode === 'true' ? handlePublishAddAnother : handleDismissPublishedSuccess}
          onDismiss={handleDismissPublishedSuccess}
        />
        <ToastViewport />
      </NativeModalSafeAreaBoundary>
    );
  }

  return (
    <NativeModalSafeAreaBoundary>
      {/* Add story sits on web mobile's album paper; editing keeps the plain page. */}
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {showComposerPaper && <StoryComposerBackdrop />}
      <SafeAreaView style={{ flex: 1, backgroundColor: showComposerPaper ? 'transparent' : COLORS.background }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>

          {/* ── Header ── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
            <TouchableOpacity onPress={handleCancel} activeOpacity={0.7}
              hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
              accessibilityLabel="Cancel editing"
              style={{ height: 34, paddingHorizontal: 12, flexDirection: 'row', gap: 5, borderRadius: 999, backgroundColor: COLORS.fillWeak, alignItems: 'center', justifyContent: 'center' }}>
              <ArrowLeft size={16} color={COLORS.textBase} />
              <Text style={{ ...TYPE.label, color: COLORS.textBase }}>Cancel</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {isStory && (
                <>
                  {/* Drafts with the current autosave status */}
                  <TouchableOpacity onPress={() => {
                    Haptics.selectionAsync();
                    editorBridge?.blur(); // dismiss WKWebView keyboard (Tiptap body)
                    Keyboard.dismiss();   // dismiss native keyboard (title TextInput)
                    // Inject props into store so DraftsSheet can read them (it reads from useUiStore)
                    // Use setState directly to update sheetProps without activating the global SheetManager
                    useUiStore.setState({ sheetProps: {
                      email: user?.email,
                      onLoadDraft: (draft: StoryDraft) => {
                        draftsSheetRef.current?.dismiss();
                        draftIdRef.current = draft.id;
                        setCurrentDraftId(draft.id);
                        setTitle(draft.title ?? '');
                        const body = draft.body ?? '';
                        setStoryBody(body);
                        latestTitleRef.current = draft.title ?? '';
                        latestBodyRef.current = body;
                        const hasContent = hasMeaningfulStoryBodyContent(body);
                        storyHasContentRef.current = hasContent;
                        setStoryHasContent(hasContent);
                        richEditorRef.current?.setContent(body);
                        if (Array.isArray(draft.attachments) && draft.attachments.length) {
                          setAttachments(draft.attachments.filter(a => a.fileId).map(a => ({
                            clientId: `restored_${a.fileId}_${Math.random().toString(36).slice(2)}`,
                            fileId: a.fileId,
                            uri: a.uri,
                            name: a.name,
                            mimeType: a.mimeType,
                            isVoice: a.isVoice,
                            duration: a.duration,
                            isUploading: false,
                          })));
                        } else {
                          setAttachments([]);
                        }
                        for (const attachment of draft.attachments || []) {
                          if (!attachment.fileId) void uploadAndAdd(attachment.uri, attachment.mimeType, attachment.name, { isVoice: attachment.isVoice, duration: attachment.duration });
                        }
                        setSavedStatus('saved');
                      },
                    }});
                    draftsSheetRef.current?.present();
                  }} activeOpacity={0.7}
                    hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                    accessibilityLabel="Story drafts"
                    disabled={isRecording || isTranscribing}
                    style={{ height: 34, paddingHorizontal: 12, borderRadius: radius(17), backgroundColor: COLORS.fillWeak, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: draftDotColor }} />
                    <Text style={{ ...TYPE.label, color: COLORS.textBase }}>Drafts</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                    if (!storyCanContinue) return;
                    if (anyUploading || isRecording || isTranscribing) return;
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    handleOpenPublishSheet();
                  }}
                    disabled={!storyCanContinue || anyUploading || isRecording || isTranscribing} activeOpacity={0.8}
                    hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                    accessibilityLabel="Next step"
                    style={[{ height: 34, paddingHorizontal: 18, borderRadius: 999, backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }, (!storyCanContinue || anyUploading || isRecording || isTranscribing) && { opacity: 0.4 }]}>
                    {anyUploading && <ActivityIndicator size="small" color={COLORS.textInverse} />}
                    <Text style={{ ...TYPE.label, color: COLORS.textInverse }}>Next</Text>
                  </TouchableOpacity>
                </>
              )}
              {!isStory && (
                // Always show the Draft button; grayed out when no saved draft exists
                <TouchableOpacity
                  onPress={() => {
                    if (!hasQcDraft) return;
                    Haptics.selectionAsync();
                    setQcBody(savedQcBody);
                  }}
                  activeOpacity={hasQcDraft ? 0.7 : 1}
                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                  accessibilityLabel="Quick capture draft"
                  style={{ height: 34, paddingHorizontal: 12, borderRadius: radius(17), backgroundColor: COLORS.fillWeak, flexDirection: 'row', alignItems: 'center', gap: 4, opacity: hasQcDraft ? 1 : 0.35 }}
                >
                  <MoreHorizontal size={iconSize(14)} color={COLORS.textBase} strokeWidth={2} />
                  <Text style={{ ...TYPE.bodySmall, color: COLORS.textBase }}>Draft</Text>
                </TouchableOpacity>
              )}
              {!isStory && qcHasContent && (
                <TouchableOpacity onPress={handleSave} disabled={!canSave || qcPending} activeOpacity={0.7}
                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                  accessibilityLabel="Save note"
                  style={{ height: 34, paddingHorizontal: 16, borderRadius: radius(17), backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center' }}>
                  {qcPending ? <ActivityIndicator size="small" color={COLORS.textInverse} /> : <Text style={{ ...TYPE.label, color: COLORS.textInverse }}>Save</Text>}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── Story mode: unified ScrollView — title + attachments + body scroll together ── */}
          {isStory && (
            <View
              style={{ flex: 1 }}
            >
              {/* Title */}
              {/* Multiline so long titles wrap. Return still moves to the body
                  instead of adding a line break, and pasted line breaks become spaces. */}
              <TextInput
                selectionColor={COLORS.brand}
                cursorColor={COLORS.brand}
                ref={titleRef}
                value={title}
                onChangeText={handleTitleChange}
                placeholder="Title"
                placeholderTextColor={COLORS.textDisabled}
                style={{ ...TYPE.editorTitle, color: COLORS.textStrong, padding: 0, paddingHorizontal: 16, marginBottom: 4, marginTop: 4, textAlignVertical: 'top' }}
                multiline
                scrollEnabled={false}
                submitBehavior="submit"
                returnKeyType="next"
                autoCapitalize="sentences"
                autoCorrect
                onSubmitEditing={() => richEditorRef.current?.focus()}
              />

              {/* ── Attachment strip ── */}
              {attachments.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  style={{ flexGrow: 0, flexShrink: 0 }}
                  contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row', alignItems: 'center' }}
                >
                  {/* Image / video chips */}
                  {mediaAttachments.map((a, idx) => {
                    const globalIdx = attachments.findIndex(x => x.clientId === a.clientId);
                    const targetIdx = globalIdx >= 0 ? globalIdx : idx;
                    const isVideo = a.mimeType.startsWith('video/');
                    return (
                      <TouchableOpacity key={a.clientId} activeOpacity={0.85}
                        onPress={() => handleOpenAttachmentPreview(targetIdx)}
                        style={{ width: 72, height: 72, borderRadius: 12, overflow: 'hidden', position: 'relative', backgroundColor: COLORS.mediaSurface }}>
                        <Image source={{ uri: a.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        {/* Play overlay for videos */}
                        {isVideo && !a.isUploading && (
                          <View style={{ ...StyleSheet.absoluteFill, backgroundColor: COLORS.mediaScrim, alignItems: 'center', justifyContent: 'center' }}>
                            <Play size={18} color={COLORS.textInverse} fill={COLORS.textInverse} strokeWidth={0} />
                          </View>
                        )}
                        {a.isUploading && (
                          <View style={{ ...StyleSheet.absoluteFill, backgroundColor: COLORS.mediaScrim, alignItems: 'center', justifyContent: 'center' }}>
                            <ActivityIndicator color={COLORS.textInverse} />
                          </View>
                        )}
                        <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleRemoveAttachment(a.clientId); }}
                          style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.mediaScrim, alignItems: 'center', justifyContent: 'center' }}>
                          <X size={10} color={COLORS.textInverse} strokeWidth={2.5} />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                  {/* Voice chips */}
                  {voiceAttachments.map(a => {
                    const dur = a.duration ?? 0;
                    return (
                      <View key={a.clientId} style={{ height: 44, backgroundColor: COLORS.mediaSurface, borderRadius: 22, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Music size={13} color={COLORS.textInverse} strokeWidth={1.8} />
                        <Text style={{ ...TYPE.metadata, color: COLORS.mediaTextWeak }}>{Math.floor(dur/60)}:{String(Math.floor(dur%60)).padStart(2,'0')}</Text>
                        {a.isUploading
                          ? <ActivityIndicator size="small" color={COLORS.textInverse} />
                          : (
                            <TouchableOpacity onPress={() => handleRemoveAttachment(a.clientId)} hitSlop={8}>
                              <X size={11} color={COLORS.mediaTextWeak} strokeWidth={2} />
                            </TouchableOpacity>
                          )}
                      </View>
                    );
                  })}
                  {/* Document chips */}
                  {documentAttachments.map(a => (
                    <View key={a.clientId} style={{ height: 44, backgroundColor: COLORS.fillWeak, borderRadius: 22, borderWidth: 1, borderColor: COLORS.strokeWeaker, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 180 }}>
                      <FileText size={13} color={COLORS.brand} strokeWidth={1.8} />
                      <Text style={{ ...TYPE.metadata, color: COLORS.textStrong, flexShrink: 1 }} numberOfLines={1}>{a.name}</Text>
                      {a.isUploading
                        ? <ActivityIndicator size="small" color={COLORS.brand} />
                        : (
                          <TouchableOpacity onPress={() => handleRemoveAttachment(a.clientId)} hitSlop={8}>
                            <X size={11} color={COLORS.textWeak} strokeWidth={2} />
                          </TouchableOpacity>
                        )}
                    </View>
                  ))}
                </ScrollView>
              )}

              {/* WYSIWYG body — takes all remaining vertical space.
                  editorInstanceKey forces a full remount (blank WebView) when
                  "Add another story" is tapped after publishing. */}
              {isDraftLoaded ? (
                <>
                  <StoryRichEditor
                    key={editorInstanceKey}
                    ref={richEditorRef}
                    initialContent={storyBody}
                    onChange={handleStoryBodyChange}
                    onBridgeReady={handleBridgeReady}
                    scrollEnabled={true}
                    transparent={showComposerPaper}
                  />
                  {/* OpenGraph link preview cards */}
                  <LinkPreviews variant="composer" text={storyLinkText.split('\n').filter(url => !dismissedLinks.includes(url)).join('\n')} onRemove={url => setDismissedLinks(previous => [...previous, url])} style={{ marginHorizontal: 20, marginBottom: 8 }} />
                </>
              ) : (
                <View style={{ minHeight: 200, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator color={COLORS.brand} />
                </View>
              )}
            </View>
          )}

          {/* ── Quick-capture content: ScrollView ── */}
          {!isStory && (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <>
                <TextInput selectionColor={COLORS.brand} cursorColor={COLORS.brand} ref={bodyRef} value={qcBody} onChangeText={v => setQcBody(v.slice(0, NOTE_CHAR_MAX))}
                  placeholder="What's on your mind?" placeholderTextColor={isRecording ? COLORS.brand : COLORS.textMuted}
                  style={{ ...TYPE.input, lineHeight: 24, color: COLORS.textStrong, padding: 0, margin: 0, textAlignVertical: 'top', minHeight: 56 }}
                  multiline autoFocus autoCorrect autoCapitalize="sentences" blurOnSubmit={false} scrollEnabled={false} maxLength={NOTE_CHAR_MAX} />
                {isRecording && (
                  <RecordingStatus seconds={recDuration} style={{ marginTop: 8 }} />
                )}
                {/* OpenGraph link preview cards */}
                <LinkPreviews text={qcBody} style={{ marginTop: 8 }} />
                {/* Attachment previews — images AND videos shown as tappable thumbnails */}
                {mediaAttachments.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                      {mediaAttachments.slice(0, 6).map((a, idx) => {
                        const isLast = idx === 5 && mediaAttachments.length > 6;
                        const isVideo = a.mimeType.startsWith('video/');
                        const globalIdx = attachments.findIndex(x => x.clientId === a.clientId);
                        const targetIdx = globalIdx >= 0 ? globalIdx : idx;
                        return (
                          <TouchableOpacity key={a.clientId} activeOpacity={0.85}
                            onPress={() => handleOpenAttachmentPreview(targetIdx)}
                            style={{ width: '31.5%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', position: 'relative', backgroundColor: COLORS.mediaSurface }}>
                            <Image source={{ uri: a.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                            {/* Play overlay for videos */}
                            {isVideo && !a.isUploading && (
                              <View style={{ ...StyleSheet.absoluteFill, backgroundColor: COLORS.mediaScrim, alignItems: 'center', justifyContent: 'center' }}>
                                <Play size={22} color={COLORS.textInverse} fill={COLORS.textInverse} strokeWidth={0} />
                              </View>
                            )}
                            {isLast && (
                              <View style={{ ...StyleSheet.absoluteFill, backgroundColor: COLORS.mediaScrim, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ ...TYPE.label, color: COLORS.mediaText }}>+{mediaAttachments.length - 6}</Text>
                              </View>
                            )}
                            {a.isUploading && (
                              <View style={{ ...StyleSheet.absoluteFill, backgroundColor: COLORS.mediaScrim, alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}>
                                <ActivityIndicator color={COLORS.textInverse} />
                              </View>
                            )}
                            <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleRemoveAttachment(a.clientId); }}
                              style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.mediaScrim, alignItems: 'center', justifyContent: 'center' }}>
                              <X size={10} color={COLORS.textInverse} strokeWidth={2.5} />
                            </TouchableOpacity>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                )}
                {voiceAttachments.map(a => {
                  const dur = a.duration ?? 0;
                  return (
                    <View key={a.clientId} style={{ marginTop: 8, backgroundColor: COLORS.mediaSurface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Music size={14} color={COLORS.textInverse} strokeWidth={1.8} />
                      <Text style={{ flex: 1, ...TYPE.metadata, color: COLORS.mediaTextWeak }}>
                        Voice · {Math.floor(dur/60)}:{String(Math.floor(dur%60)).padStart(2,'0')}
                      </Text>
                      {a.isUploading && <ActivityIndicator size="small" color={COLORS.textInverse} />}
                      <TouchableOpacity onPress={() => handleRemoveAttachment(a.clientId)} hitSlop={8}>
                        <X size={12} color={COLORS.mediaTextWeak} strokeWidth={2} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
                {/* Document chips */}
                {documentAttachments.map(a => (
                  <View key={a.clientId} style={{ marginTop: 6, backgroundColor: COLORS.fillWeak, borderRadius: 12, borderWidth: 1, borderColor: COLORS.strokeWeaker, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <FileText size={14} color={COLORS.brand} strokeWidth={1.8} />
                    <Text style={{ flex: 1, ...TYPE.bodySmall, color: COLORS.textStrong }} numberOfLines={1}>{a.name}</Text>
                    {a.isUploading && <ActivityIndicator size="small" color={COLORS.brand} />}
                    <TouchableOpacity onPress={() => handleRemoveAttachment(a.clientId)} hitSlop={8}>
                      <X size={12} color={COLORS.textWeak} strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                ))}
                {saveError && <Text style={{ ...TYPE.bodySmall, color: COLORS.error, marginTop: 8 }}>{saveError}</Text>}
              </>
            </ScrollView>
          )}

          {/* Quick Capture is intentionally private. */}
          {!isStory && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.strokeWeaker }}>
              <Lock size={14} color={COLORS.textMuted} strokeWidth={1.8} />
              <Text style={{ ...TYPE.metadata, color: COLORS.textMuted }}>Private · Only me</Text>
            </View>
          )}

          {/* ── Action bar — story mode: ⊕ upload + inline formatting tools
                          quick-capture: mode pill + media buttons ── */}
          {(dictationError || isTranscribing) && (
            <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
              {isTranscribing ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><ActivityIndicator color={COLORS.textBase} /><Text accessibilityLiveRegion="polite" style={{ ...TYPE.bodySmall, color: COLORS.textBase }}>Transcribing…</Text></View> : <Text accessibilityRole="alert" style={{ ...TYPE.bodySmall, color: COLORS.error }}>{dictationError}</Text>}
              {canRetry && <View style={{ flexDirection: 'row', gap: 12 }}>
                <Button variant="secondary" size="sm" style={{ flex: 1 }} onPress={() => { void retryRecording(); }}>Retry transcription</Button>
                <Button variant="ghost" size="sm" onPress={() => { void discardRecording(); }}>Discard recording</Button>
              </View>}
            </View>
          )}
          {isRecording && <StoryRecordingPanel starting={isStarting} levels={recordingLevels} seconds={recDuration} onCancel={handleCancelDictation} onStop={handleStopDictation} />}
          <EditorActionBar
            mode={mode}
            disableModeSwitch
            onSwitchMode={() => {}}
            onPhoto={handleImagePicker}
            onCamera={handleOpenCamera}
            onAudio={handleVoice}
            audioDisabled={isTranscribing || canRetry}
            onFile={handleAudioFile}
            isRecording={isRecording}
            editor={isStory ? editorBridge : null}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
      </View>

      {/* Media previewer */}
      <MediaPreviewModal
        visible={previewVisible}
        attachments={attachments}
        initialIndex={previewIndex}
        onClose={() => setPreviewVisible(false)}
        onRemove={(clientId) => {
          Haptics.selectionAsync();
          setAttachments(prev => prev.filter(a => a.clientId !== clientId));
          if (attachments.length <= 1) setPreviewVisible(false);
        }}
      />

      {/* Camera capture — photo + video via expo-camera CameraView */}
      <CameraCaptureModal
        visible={cameraVisible}
        onClose={() => setCameraVisible(false)}
        onCapture={handleCameraCapture}
      />

      {/* Local sheets — must live inside a BottomSheetModalProvider scoped to
          this editor window so they display correctly on iOS fullScreenModal */}
      <SafeAreaInsetsContext.Consumer>
        {(modalInsets) => (
          <>
        <BottomSheetModal
          ref={publishSheetRef}
          {...sheetChrome.props}
          snapPoints={sheetChrome.snapPoints(['92%'])}
          enablePanDownToClose
          onDismiss={() => {
            setShowPublish(false);
            if (pendingPublishedUrlRef.current) {
              const url = pendingPublishedUrlRef.current;
              pendingPublishedUrlRef.current = null;
              setPublishedUrl(url);
            }
          }}
          keyboardBehavior="fillParent"
          keyboardBlurBehavior="restore"
          android_keyboardInputMode="adjustResize"
          handleComponent={renderPublishHeader}
        >
            <PublishModalInner
              title={title}
              body={storyBody}
              attachmentIds={uploadedIds}
              memoryId={memoryId}
              draftId={currentDraftId}
              userEmail={user?.email}
              initialTags={initialTags}
              initialBeneficiaryIds={initialBeneficiaryIds}
              initialGroupIds={initialGroupIds}
              initialVisibility={initialParsedData?.visibility}
              onClose={handleClosePublishSheet}
              onComplete={handlePublishFlowComplete}
              onPublished={handlePublishCreated}
            />
        </BottomSheetModal>
        <BottomSheetModal
          ref={draftsSheetRef}
          {...sheetChrome.props}
          snapPoints={sheetChrome.snapPoints(['75%'])}
          enableDynamicSizing={false}
          enablePanDownToClose
          keyboardBehavior="interactive"
          keyboardBlurBehavior="restore"
        >
          <View style={{ flex: 1, paddingBottom: getSheetBottomPadding(modalInsets?.bottom ?? 0, 16) }}>
            <DraftsSheet onClose={() => draftsSheetRef.current?.dismiss()} />
          </View>
        </BottomSheetModal>
          </>
        )}
      </SafeAreaInsetsContext.Consumer>
    </NativeModalSafeAreaBoundary>
  );
}
