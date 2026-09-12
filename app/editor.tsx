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
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet, Image,
  ActivityIndicator, Keyboard, Modal, ImageBackground, Linking,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider, SafeAreaInsetsContext, initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MoreHorizontal, Plus, X, Users, ChevronDown, Sparkles,
  Copy, Check, Lock, FileText, Play, Camera, Mic, Video, Music,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as ExpoCamera from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeIn, FadeOut, FadeInDown } from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import {
  getAutosaveStatusBadge,
  type AutosaveStatus,
} from '@/features/editor/autosave';
import { useUserStore } from '@/store';
import { useCreateMemory, useUpdateMemory } from '@/hooks/mutations/use-memory-mutations';
import { useQuickCapture } from '@/hooks/mutations/use-quick-capture';
import { useFileUpload } from '@/hooks/mutations/use-file-upload';
import { useGroups } from '@/hooks/queries/use-groups';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';
import { useToast } from '@/components/ui/Toast';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop, BottomSheetModalProvider, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { upsertDraft, loadDrafts, deleteDraft, DraftsSheet, type StoryDraft, type StoryDraftAttachment } from '@/components/sheets/DraftsSheet';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useUiStore } from '@/store';
import { EditorActionBar } from '@/components/ui/EditorActionBar';
import { MediaPreviewModal } from '@/components/ui/MediaPreviewModal';
import { CameraCaptureModal } from '@/components/ui/CameraCaptureModal';
import { RecordingStatus } from '@/components/ui/RecordingStatus';
import { StoryRichEditor, FormattingToolbar, type StoryRichEditorRef } from '@/components/ui/StoryRichEditor';
import { LinkPreviews } from '@/components/ui/LinkPreview';
import type { EditorBridge } from '@10play/tentap-editor';
import client from '@/api/client';
import endpoint from '@/api/endpoint';
import type { IFile } from '@/types';
import { PublishPrivacySheet, type PrivacyMode } from '@/components/sheets/PublishPrivacySheet';
import { deriveMemoryAudience, formatMemoryAudienceLabel, type MemoryAudienceSelection, type MemoryVisibility } from '@/features/memories/memory-audience';
import { buildEditorPublishPayload } from '@/features/editor/editor-publish-payload';
import { publishedPostUrl } from '@/lib/env';
import { isPermissionGranted, type PermissionLike } from '@/lib/permission-recovery';
import { showPermissionRecoveryAlert } from '@/lib/show-permission-recovery-alert';
import { getSheetBottomPadding, getSheetTopInset } from '@/features/layout/sheet-safe-area';
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

// ─── Constants ────────────────────────────────────────────────────────────────

const STORY_DRAFT_KEY = (email?: string | null) => `article_draft_${email ?? 'anon'}`;
const QC_DRAFT_KEY = (email?: string | null) => `qc_draft_${email ?? 'anon'}`;
const NOTE_CHAR_MAX = 8000;
const FILE_INPUT_MIME = DOCUMENT_PICKER_MIME_TYPES;

const SURFER_WEBP = require('../assets/images/illustrations/surfer.webp');
const SUCCESS_BG = require('../assets/images/backgrounds/published_success_bg.webp');
const SUN = require('../assets/images/illustrations/fluent-emoji-flat_ringed-planet.png');
const BIG_CLOUD = require('../assets/images/illustrations/noto-v1_cloud.png');
const SMALL_CLOUD = require('../assets/images/illustrations/noto_cloud.png');
const SOCIAL_LINKEDIN = require('../assets/images/icons/linkedin.png');
const SOCIAL_FACEBOOK = require('../assets/images/icons/facebook.png');
const SOCIAL_INSTAGRAM = require('../assets/images/icons/instagram.png');
const SOCIAL_X = require('../assets/images/icons/x.png');

// ─── Types ────────────────────────────────────────────────────────────────────

type AttachmentItem = UploadAttachment<IFile>;

function toStoryDraftAttachments(attachments: AttachmentItem[]): StoryDraftAttachment[] {
  return attachments.flatMap((attachment) => {
    const fileId = attachment.fileId;
    if (!fileId || attachment.isUploading) return [];

    return [{
      fileId,
      uri: attachment.file?.url || attachment.uri,
      name: attachment.name,
      mimeType: attachment.mimeType,
      isVoice: attachment.isVoice,
      duration: attachment.duration,
    }];
  });
}

function hasMeaningfulStoryBodyContent(html?: string | null) {
  if (!html) return false;

  const normalized = html
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<\/p>\s*<p>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();

  return normalized.length > 0;
}

// ─── Publish success screen ───────────────────────────────────────────────────

function PublishSuccessView({ publishedUrl, onAddAnother, onDismiss }: {
  publishedUrl: string; onAddAnother: () => void; onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const insets = useSafeAreaInsets();

  const handleCopy = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(publishedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [publishedUrl]);

  const openSocial = useCallback((platform: 'linkedin'|'facebook'|'instagram'|'x') => {
    Haptics.selectionAsync();
    const encoded = encodeURIComponent(publishedUrl);
    const urls: Record<string,string> = {
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
      instagram: 'https://www.instagram.com/',
      x: `https://x.com/intent/tweet?url=${encoded}`,
    };
    Linking.openURL(urls[platform]).catch(() => {});
  }, [publishedUrl]);

  const truncatedUrl = publishedUrl.length > 32 ? publishedUrl.slice(0, 32) + '…' : publishedUrl;

  return (
    <ImageBackground source={SUCCESS_BG} style={{ flex: 1 }} resizeMode="cover">
      <View style={{ flex: 1, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }}>
        <View style={{ height: 220, width: '100%', position: 'relative' }}>
          <Image source={SUN} style={{ position: 'absolute', width: 52, height: 52, left: 80, top: 60 }} resizeMode="contain" />
          <Image source={BIG_CLOUD} style={{ position: 'absolute', width: 90, height: 72, right: '50%', marginRight: -140, top: 20 }} resizeMode="contain" />
          <Image source={SMALL_CLOUD} style={{ position: 'absolute', width: 44, height: 36, left: '50%', top: 20 }} resizeMode="contain" />
          <Image source={SURFER_WEBP} style={{ position: 'absolute', width: 220, height: 220, alignSelf: 'center', bottom: 0 }} resizeMode="contain" />
        </View>
        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={{ flex: 1, paddingHorizontal: 24, paddingTop: 24, alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ ...TYPE.sectionTitle, color: COLORS.textStrong, textAlign: 'center', lineHeight: 34 }}>
            Story published
          </Text>
          <View style={{ width: '100%', backgroundColor: COLORS.fillWeak, borderRadius: 20, padding: 20, gap: 16 }}>
            <Text style={{ ...TYPE.bodySmall, color: COLORS.textBase }}>Share this story with friends</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.strokeWeaker, overflow: 'hidden' }}>
              <Text style={{ flex: 1, ...TYPE.bodySmall, color: COLORS.textWeak, paddingHorizontal: 14, paddingVertical: 14 }} numberOfLines={1}>{truncatedUrl}</Text>
              <TouchableOpacity onPress={handleCopy} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, paddingVertical: 14, borderLeftWidth: 1, borderLeftColor: COLORS.strokeWeaker }}>
                {copied ? <Check size={15} color={COLORS.success} strokeWidth={2.5} /> : <Copy size={15} color={COLORS.info} strokeWidth={2} />}
                <Text style={{ ...TYPE.bodySmall, color: copied ? COLORS.success : COLORS.info }}>{copied ? 'Copied!' : 'Copy'}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: COLORS.strokeWeaker }} />
              <Text style={{ ...TYPE.metadata, color: COLORS.textMuted }}>Or share on social media</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: COLORS.strokeWeaker }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
              {([
                { id: 'linkedin', icon: SOCIAL_LINKEDIN },
                { id: 'facebook', icon: SOCIAL_FACEBOOK },
                { id: 'instagram', icon: SOCIAL_INSTAGRAM },
                { id: 'x', icon: SOCIAL_X },
              ] as const).map(({ id, icon }) => (
                <TouchableOpacity key={id} onPress={() => openSocial(id)} activeOpacity={0.75}
                  style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.strokeWeaker, alignItems: 'center', justifyContent: 'center' }}>
                  <Image source={icon} style={{ width: 28, height: 28 }} resizeMode="contain" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onAddAnother(); }} activeOpacity={0.85}
            style={{ width: '100%', height: 56, borderRadius: 999, backgroundColor: COLORS.textStrong, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Plus size={18} color={COLORS.textInverse} strokeWidth={2.5} />
            <Text style={{ ...TYPE.button, color: COLORS.textInverse }}>Add another story</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDismiss} activeOpacity={0.7} style={{ paddingVertical: 12, paddingHorizontal: 24 }}>
            <Text style={{ ...TYPE.body, color: COLORS.textBase, textAlign: 'center' }}>Dismiss</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </ImageBackground>
  );
}

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
  onPublished: (url: string) => void;
  memoryId?: string;
  draftId?: string;
  userEmail?: string | null;
  initialTags?: string;
  initialBeneficiaryIds?: string[];
  initialGroupIds?: string[];
  initialVisibility?: MemoryVisibility;
}) {
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
          void deleteDraft(userEmail, draftId, { skipRemote: true });
        }
        const id = res?.data?._id ?? res?.data?.data?._id ?? targetMemoryId ?? '';
        onPublished(publishedPostUrl(id));
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

  const handleClose = useCallback(() => {
    setTags(''); setAudience(deriveMemoryAudience({})); onClose();
  }, [onClose]);

    return (
      <>
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: Math.max(insets.bottom + 24, 32) }}
        >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <Text style={{ ...TYPE.sectionTitle, color: COLORS.textStrong }}>Publish post</Text>
                <TouchableOpacity onPress={handleClose} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.fillWeak, alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} color={COLORS.textBase} strokeWidth={2} />
                </TouchableOpacity>
              </View>
              <View style={{ backgroundColor: COLORS.fillWeak, borderRadius: 16, padding: 16, marginBottom: 24 }}>
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
              <View style={{ marginBottom: 32 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ ...TYPE.body, color: COLORS.textStrong }}>Add Tags</Text>
                  <TouchableOpacity onPress={handleAutotag} disabled={isAutotagging} activeOpacity={0.8}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: `${COLORS.info}40`, backgroundColor: `${COLORS.info}08` }}>
                    {isAutotagging ? <ActivityIndicator size="small" color={COLORS.info} /> : <Sparkles size={13} color={COLORS.info} strokeWidth={2} />}
                    <Text style={{ ...TYPE.metadata, color: COLORS.info }}>Autotag</Text>
                  </TouchableOpacity>
                </View>
                <BottomSheetTextInput value={tags} onChangeText={setTags} placeholder="Manually enter tags or use the autotag button" placeholderTextColor={COLORS.textMuted} returnKeyType="done"
                  style={{ backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.strokeWeaker, paddingHorizontal: 14, paddingVertical: 14, ...TYPE.label, color: COLORS.textStrong, minHeight: 50 }} />
              </View>
              <TouchableOpacity onPress={handlePost} activeOpacity={0.85} disabled={(!title.trim() && !body.trim()) || isPending}
                style={[{ height: 56, borderRadius: 999, backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center' }, ((!title.trim() && !body.trim()) || isPending) && { opacity: 0.45 }]}>
                {isPending ? <ActivityIndicator color={COLORS.textInverse} /> : <Text style={{ ...TYPE.button, color: COLORS.textInverse }}>Post now</Text>}
              </TouchableOpacity>
        </BottomSheetScrollView>
      </View>
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
  const router = useRouter();
  const { mode: rawMode, memoryId, initialData, lockMode } = useLocalSearchParams<{
    mode?: string; memoryId?: string; initialData?: string; lockMode?: string;
  }>();
  const mode = (rawMode === 'quick-capture' ? 'quick-capture' : 'story') as 'story' | 'quick-capture';
  const isStory = mode === 'story';
  const isEditing = !!memoryId;
  // When lockMode is set, the mode toggle is hidden — user cannot switch to quick-capture
  const isModeSwithDisabled = lockMode === 'true' || isEditing;

  const user = useUserStore(s => s.user);

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
      return initialParsedData.beneficiaries.map((b: any) => b._id || b.id).filter(Boolean);
    }
    return [];
  }, [initialParsedData]);

  const initialGroupIds = useMemo(() => {
    if (initialParsedData?.groups && Array.isArray(initialParsedData.groups)) {
      return initialParsedData.groups.map((group: any) => group._id || group.id).filter(Boolean);
    }
    return [];
  }, [initialParsedData]);

  const titleRef = useRef<TextInput>(null);
  const bodyRef = useRef<TextInput>(null);
  const richEditorRef = useRef<StoryRichEditorRef>(null);
  const isMountedRef = useRef(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Multi-draft: each new story session gets its own id so up to 10 drafts can coexist
  const draftIdRef = useRef<string>(isEditing ? '' : `draft_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  // Refs to track latest title/body synchronously — avoids stale closure in Cancel handler
  const latestTitleRef = useRef('');
  const latestBodyRef = useRef('');
  // currentDraftId mirrors draftIdRef as state so PublishModal always receives the live value
  const [currentDraftId, setCurrentDraftId] = useState(draftIdRef.current);
  const storyDrafts = useUiStore((s) => s.storyDrafts);
  const setStoryDrafts = useUiStore((s) => s.setStoryDrafts);
  const draftCount = storyDrafts.length;
  // Incrementing this key forces StoryRichEditor to fully remount (blank WebView)
  const [editorInstanceKey, setEditorInstanceKey] = useState(0);

  // Story state
  const [title, setTitle] = useState('');
  const [storyBody, setStoryBody] = useState('');
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
  const [cancelConfirmVisible, setCancelConfirmVisible] = useState(false);
  const [cancelConfirmTitle, setCancelConfirmTitle] = useState('');
  const [cancelConfirmMessage, setCancelConfirmMessage] = useState('');
  const [cancelConfirmOnSave, setCancelConfirmOnSave] = useState<(() => void) | null>(null);

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
      description: 'Allow microphone access to add a voice note to this memory.',
      settingsDescription: 'Microphone access is turned off in Settings. Turn it back on to add a voice note to this memory.',
    });
  }, []);
  const { start: startRecording, stop: stopRecording, isRecording, duration: recDuration } = useAudioRecorder({
    onPermissionDenied: handleMicrophonePermissionDenied,
  });

  useEffect(() => { return () => { isMountedRef.current = false; if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }; }, []);

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
      if (!t.trim() && !b.trim()) {
        // Empty — remove this draft slot silently
        if (draftIdRef.current) {
          await deleteDraft(user?.email, draftIdRef.current).catch(() => {});
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
          // Refresh the badge count via unified store
          loadDrafts(user?.email).then(d => {
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
    if (isRecording) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); const uri = await stopRecording(); if (uri) await uploadAndAdd(uri, 'audio/m4a', `voice_${Date.now()}.m4a`, { isVoice: true, duration: recDuration }); }
    else { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); await startRecording(); }
  }, [isRecording, stopRecording, startRecording, recDuration, uploadAndAdd]);

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

  // Stable onChange for StoryRichEditor — avoids recreating the bridge on every render
  // Note: does NOT call scheduleSave — draft is only saved when the user taps Cancel
  // latestBodyRef is updated synchronously so Cancel always has the latest content
  const handleStoryBodyChange = useCallback((v: string) => {
    latestBodyRef.current = v;
    scheduleSave(latestTitleRef.current, v);

    // Only update content state when transitioning (has content vs no content)
    const hasContent = hasMeaningfulStoryBodyContent(v);
    if (hasContent !== storyHasContentRef.current) {
      storyHasContentRef.current = hasContent;
      setStoryHasContent(hasContent);
    }
  }, [scheduleSave]);
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
  const autosaveBadge = getAutosaveStatusBadge(savedStatus);

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

  const lastPublishedUrlRef = useRef<string | null>(null);

  const handlePublishCreated = useCallback((url: string) => {
    lastPublishedUrlRef.current = url;
    pendingPublishedUrlRef.current = url;
    setShowPublish(false);
    publishSheetRef.current?.dismiss();
  }, []);

  const handleDismissPublishedSuccess = useCallback(() => {
    if (isEditing) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/stories');
      }
    } else {
      if (lockMode === 'true' || !router.canGoBack()) {
        router.replace('/(tabs)/stories');
      } else {
        router.back();
      }
    }
    // Clean up modal state in the background after the screen transition begins
    setTimeout(() => {
      setPublishedUrl(null);
      lastPublishedUrlRef.current = null;
    }, 500);
  }, [isEditing, lockMode, router]);

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

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <BottomSheetModalProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>

          {/* ── Header ── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
            <TouchableOpacity onPress={() => {
              Haptics.selectionAsync();
              const cancelTitle = latestTitleRef.current || title;
              const cancelBody = latestBodyRef.current || storyBody;
              const hasContent = isStory
                ? !isEditing && (cancelTitle.trim() || cancelBody.trim())
                : qcBody.trim().length > 0;

              if (!hasContent) {
                // Nothing typed — exit immediately
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace(lockMode === 'true' || isStory ? '/(tabs)/stories' : '/(tabs)/overview');
                }
                return;
              }

              // Dismiss keyboard then show custom dialog
              editorBridge?.blur();
              Keyboard.dismiss();

              const saveOnPress = async () => {
                setCancelConfirmVisible(false);
                if (isStory) {
                  const savedAttachments = toStoryDraftAttachments(attachments);
                  await upsertDraft(user?.email, {
                    id: draftIdRef.current, title: cancelTitle, body: cancelBody, updatedAt: Date.now(),
                    attachments: savedAttachments.length ? savedAttachments : undefined,
                  }).catch(() => {});
                  loadDrafts(user?.email).then(d => setStoryDrafts(d)).catch(() => {});
                } else {
                  AsyncStorage.setItem(QC_DRAFT_KEY(user?.email), JSON.stringify({ body: qcBody.trim() })).catch(() => {});
                }
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace(lockMode === 'true' || isStory ? '/(tabs)/stories' : '/(tabs)/overview');
                }
              };

              setCancelConfirmTitle('Save to drafts?');
              setCancelConfirmMessage(isStory ? 'Your story will be saved to your drafts.' : 'Your note will be saved to your drafts.');
              setCancelConfirmOnSave(() => saveOnPress);
              setCancelConfirmVisible(true);
            }} activeOpacity={0.7}
              style={{ height: 34, paddingHorizontal: 16, borderRadius: 999, backgroundColor: COLORS.fillWeak, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ ...TYPE.label, color: COLORS.textBase }}>Cancel</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {isStory && (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: COLORS.fillWeaker }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: autosaveBadge.dotColor }} />
                    <Text style={{ ...TYPE.metadata, color: autosaveBadge.textColor }}>{autosaveBadge.label}</Text>
                  </View>
                  {/* My Drafts button — badge shows count, opens DraftsSheet */}
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
                          setAttachments(draft.attachments.map(a => ({
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
                        setSavedStatus('saved');
                      },
                    }});
                    draftsSheetRef.current?.present();
                  }} activeOpacity={0.7}
                    style={{ height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: COLORS.fillWeak, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <MoreHorizontal size={16} color={COLORS.textBase} strokeWidth={2} />
                    {draftCount > 0 && (
                      <View style={{ minWidth: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                        <Text style={{ ...TYPE.eyebrow, color: COLORS.textInverse }}>{draftCount}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                    if (!storyHasContent) return;
                    if (anyUploading) return;
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    handleOpenPublishSheet();
                  }}
                    disabled={!storyHasContent || anyUploading} activeOpacity={0.8}
                    style={[{ height: 34, paddingHorizontal: 18, borderRadius: 999, backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }, (!storyHasContent || anyUploading) && { opacity: 0.4 }]}>
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
                  style={{ height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: COLORS.fillWeak, flexDirection: 'row', alignItems: 'center', gap: 4, opacity: hasQcDraft ? 1 : 0.35 }}
                >
                  <MoreHorizontal size={14} color={COLORS.textBase} strokeWidth={2} />
                  <Text style={{ ...TYPE.bodySmall, color: COLORS.textBase }}>Draft</Text>
                </TouchableOpacity>
              )}
              {!isStory && qcHasContent && (
                <TouchableOpacity onPress={handleSave} disabled={!canSave || qcPending} activeOpacity={0.7}
                  style={{ height: 34, paddingHorizontal: 16, borderRadius: 17, backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center' }}>
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
              <TextInput
                ref={titleRef}
                value={title}
                 onChangeText={v => {
                   setTitle(v);
                   latestTitleRef.current = v;
                   scheduleSave(v, latestBodyRef.current);
                 }}
                placeholder="Title"
                placeholderTextColor={COLORS.textDisabled}
                style={{ ...TYPE.displayTitle,  color: COLORS.textStrong, padding: 0, paddingHorizontal: 20, marginBottom: 4, lineHeight: 42, marginTop: 4 }}
                returnKeyType="next"
                autoCapitalize="sentences"
                autoCorrect
                onSubmitEditing={() => richEditorRef.current?.focus()}
                blurOnSubmit={false}
              />

              {/* ── Attachment strip ── */}
              {attachments.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  style={{ flexGrow: 0, flexShrink: 0 }}
                  contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 10, gap: 8, flexDirection: 'row', alignItems: 'center' }}
                >
                  {/* Image / video chips */}
                  {mediaAttachments.map((a, idx) => {
                    const globalIdx = attachments.findIndex(x => x.clientId === a.clientId);
                    const targetIdx = globalIdx >= 0 ? globalIdx : idx;
                    const isVideo = a.mimeType.startsWith('video/');
                    return (
                      <TouchableOpacity key={a.clientId} activeOpacity={0.85}
                        onPress={() => handleOpenAttachmentPreview(targetIdx)}
                        style={{ width: 72, height: 72, borderRadius: 12, overflow: 'hidden', position: 'relative', backgroundColor: COLORS.textStrong }}>
                        <Image source={{ uri: a.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        {/* Play overlay for videos */}
                        {isVideo && !a.isUploading && (
                          <View style={{ ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' }}>
                            <Play size={18} color={COLORS.textInverse} fill={COLORS.textInverse} strokeWidth={0} />
                          </View>
                        )}
                        {a.isUploading && (
                          <View style={{ ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}>
                            <ActivityIndicator color={COLORS.textInverse} />
                          </View>
                        )}
                        <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleRemoveAttachment(a.clientId); }}
                          style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
                          <X size={10} color={COLORS.textInverse} strokeWidth={2.5} />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                  {/* Voice chips */}
                  {voiceAttachments.map(a => {
                    const dur = a.duration ?? 0;
                    return (
                      <View key={a.clientId} style={{ height: 44, backgroundColor: COLORS.textStrong, borderRadius: 22, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Music size={13} color={COLORS.textInverse} strokeWidth={1.8} />
                        <Text style={{ ...TYPE.metadata, color: 'rgba(255,255,255,0.85)' }}>{Math.floor(dur/60)}:{String(Math.floor(dur%60)).padStart(2,'0')}</Text>
                        {a.isUploading
                          ? <ActivityIndicator size="small" color={COLORS.textInverse} />
                          : (
                            <TouchableOpacity onPress={() => handleRemoveAttachment(a.clientId)} hitSlop={8}>
                              <X size={11} color="rgba(255,255,255,0.7)" strokeWidth={2} />
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
                  />
                  {/* OpenGraph link preview cards */}
                  <LinkPreviews text={storyBody} style={{ marginHorizontal: 20, marginBottom: 8 }} />
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
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <>
                <TextInput ref={bodyRef} value={qcBody} onChangeText={v => setQcBody(v.slice(0, NOTE_CHAR_MAX))}
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
                            style={{ width: '31.5%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', position: 'relative', backgroundColor: COLORS.textStrong }}>
                            <Image source={{ uri: a.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                            {/* Play overlay for videos */}
                            {isVideo && !a.isUploading && (
                              <View style={{ ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' }}>
                                <Play size={22} color={COLORS.textInverse} fill={COLORS.textInverse} strokeWidth={0} />
                              </View>
                            )}
                            {isLast && (
                              <View style={{ ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ ...TYPE.label, color: '#fff' }}>+{mediaAttachments.length - 6}</Text>
                              </View>
                            )}
                            {a.isUploading && (
                              <View style={{ ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}>
                                <ActivityIndicator color={COLORS.textInverse} />
                              </View>
                            )}
                            <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleRemoveAttachment(a.clientId); }}
                              style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
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
                    <View key={a.clientId} style={{ marginTop: 8, backgroundColor: COLORS.textStrong, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Music size={14} color={COLORS.textInverse} strokeWidth={1.8} />
                      <Text style={{ flex: 1, ...TYPE.metadata, color: 'rgba(255,255,255,0.85)' }}>
                        Voice · {Math.floor(dur/60)}:{String(Math.floor(dur%60)).padStart(2,'0')}
                      </Text>
                      {a.isUploading && <ActivityIndicator size="small" color={COLORS.textInverse} />}
                      <TouchableOpacity onPress={() => handleRemoveAttachment(a.clientId)} hitSlop={8}>
                        <X size={12} color="rgba(255,255,255,0.7)" strokeWidth={2} />
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.strokeWeaker }}>
              <Lock size={14} color={COLORS.textMuted} strokeWidth={1.8} />
              <Text style={{ ...TYPE.metadata, color: COLORS.textMuted }}>Private · Only me</Text>
            </View>
          )}

          {/* ── Action bar — story mode: ⊕ upload + inline formatting tools
                          quick-capture: mode pill + media buttons ── */}
          <EditorActionBar
            mode={mode}
            disableModeSwitch={isModeSwithDisabled}
            onSwitchMode={() => {
              if (isModeSwithDisabled) return;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.setParams({ mode: isStory ? 'quick-capture' : 'story' });
              // Re-focus input after mode switch
              setTimeout(() => { (isStory ? bodyRef : titleRef).current?.focus(); }, 100);
            }}
            onPhoto={handleImagePicker}
            onCamera={handleOpenCamera}
            onAudio={handleVoice}
            onFile={handleAudioFile}
            isRecording={isRecording}
            editor={isStory ? editorBridge : null}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>

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

      <Modal visible={!!publishedUrl} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={handleDismissPublishedSuccess}>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          {(publishedUrl || lastPublishedUrlRef.current) ? (
            <PublishSuccessView
              publishedUrl={publishedUrl || lastPublishedUrlRef.current || ''}
              onAddAnother={lockMode === 'true' ? handlePublishAddAnother : handleDismissPublishedSuccess}
              onDismiss={handleDismissPublishedSuccess}
            />
          ) : null}
        </SafeAreaProvider>
      </Modal>

      {/* Cancel / discard confirmation — on-brand replacement for Alert.alert */}
      <ConfirmDialog
        visible={cancelConfirmVisible}
        title={cancelConfirmTitle}
        message={cancelConfirmMessage}
        onClose={() => setCancelConfirmVisible(false)}
        buttons={[
          { label: 'Save draft', variant: 'primary', onPress: () => { cancelConfirmOnSave?.(); } },
          { label: 'Discard', variant: 'destructive', onPress: () => {
            setCancelConfirmVisible(false);
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace(lockMode === 'true' || isStory ? '/(tabs)/stories' : '/(tabs)/overview');
            }
          } },
          { label: 'Keep editing', variant: 'ghost', onPress: () => setCancelConfirmVisible(false) },
        ]}
      />
      {/* Local sheets — must live inside a BottomSheetModalProvider scoped to
          this editor window so they display correctly on iOS fullScreenModal */}
      <SafeAreaInsetsContext.Consumer>
        {(modalInsets) => (
          <>
        <BottomSheetModal
          ref={publishSheetRef}
          topInset={getSheetTopInset(modalInsets?.top ?? 0)}
          snapPoints={['92%']}
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
          backdropComponent={(props: any) => (
            <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} pressBehavior="close" />
          )}
          handleIndicatorStyle={{ backgroundColor: COLORS.strokeStrong, opacity: 0.3 }}
          backgroundStyle={{ backgroundColor: COLORS.background }}
        >
          <BottomSheetView style={{ flex: 1 }}>
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
          </BottomSheetView>
        </BottomSheetModal>
        <BottomSheetModal
          ref={draftsSheetRef}
          topInset={getSheetTopInset(modalInsets?.top ?? 0)}
          snapPoints={['75%']}
          enablePanDownToClose
          keyboardBehavior="interactive"
          keyboardBlurBehavior="restore"
          backdropComponent={(props: any) => (
            <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} pressBehavior="close" />
          )}
          handleIndicatorStyle={{ backgroundColor: COLORS.strokeStrong, opacity: 0.3 }}
          backgroundStyle={{ backgroundColor: COLORS.background }}
        >
          <BottomSheetView style={{ paddingHorizontal: 16, paddingBottom: getSheetBottomPadding(modalInsets?.bottom ?? 0, 16) }}>
            <DraftsSheet />
          </BottomSheetView>
        </BottomSheetModal>
          </>
        )}
      </SafeAreaInsetsContext.Consumer>
      </BottomSheetModalProvider>
    </SafeAreaProvider>
  );
}
