/**
 * app/editor.tsx — Unified compose screen
 *
 * mode=story        → long-form article editor (title + body, publish flow)
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
  ActivityIndicator, Alert, Modal, ImageBackground, Linking,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider, initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MoreHorizontal, Plus, X, Users, ChevronDown, Sparkles,
  Copy, Check, Globe, FileText, Play, Camera, Mic, Video, Music,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS, FONTS } from '@/constants/tokens';
import { useUserStore } from '@/store';
import { useCreateMemory, useUpdateMemory } from '@/hooks/mutations/use-memory-mutations';
import { useQuickCapture } from '@/hooks/mutations/use-quick-capture';
import { useFileUpload } from '@/hooks/mutations/use-file-upload';
import { useBeneficiaries } from '@/hooks/queries/use-beneficiaries';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/constants/query-keys';
import { useToast } from '@/components/ui/Toast';
import { EditorActionBar } from '@/components/ui/EditorActionBar';
import { MediaPreviewModal } from '@/components/ui/MediaPreviewModal';
import client from '@/api/client';
import endpoint from '@/api/endpoint';
import type { IBeneficiary, IFile } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const STORY_DRAFT_KEY = (email?: string | null) => `article_draft_${email ?? 'anon'}`;
const QC_DRAFT_KEY = (email?: string | null) => `qc_draft_${email ?? 'anon'}`;
const PUBLISHED_BASE_URL = 'https://app.mymemento.io/post';
const NOTE_CHAR_MAX = 8000;
const MAX_FILE_MB = 15;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const FILE_INPUT_MIME = [
  // Audio
  'audio/mpeg','audio/wav','audio/webm','audio/mp4','audio/aac','audio/flac','audio/ogg','audio/*',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/rtf',
];

const SURFER_WEBP = require('../assets/images/illustrations/surfer.webp');
const SUCCESS_BG = require('../assets/images/backgrounds/published_success_bg.png');
const SUN = require('../assets/images/illustrations/fluent-emoji-flat_ringed-planet.png');
const BIG_CLOUD = require('../assets/images/illustrations/noto-v1_cloud.png');
const SMALL_CLOUD = require('../assets/images/illustrations/noto_cloud.png');
const SOCIAL_LINKEDIN = require('../assets/images/icons/linkedin.png');
const SOCIAL_FACEBOOK = require('../assets/images/icons/facebook.png');
const SOCIAL_INSTAGRAM = require('../assets/images/icons/instagram.png');
const SOCIAL_X = require('../assets/images/icons/x.png');

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttachmentItem {
  clientId: string; fileId: string; uri: string; name: string;
  mimeType: string; duration?: number; isVoice?: boolean;
  isUploading?: boolean; file?: IFile;
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
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top, paddingBottom: insets.bottom + 32 }} bounces={false}>
        <View style={{ height: 300, width: '100%', position: 'relative' }}>
          <Image source={SUN} style={{ position: 'absolute', width: 62, height: 62, left: 95, top: 95 }} resizeMode="contain" />
          <Image source={BIG_CLOUD} style={{ position: 'absolute', width: 100, height: 80, right: '50%', marginRight: -150, top: 50 }} resizeMode="contain" />
          <Image source={SMALL_CLOUD} style={{ position: 'absolute', width: 52, height: 42, left: '50%', top: 50 }} resizeMode="contain" />
          <Image source={SURFER_WEBP} style={{ position: 'absolute', width: 280, height: 280, alignSelf: 'center', bottom: 0 }} resizeMode="contain" />
        </View>
        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={{ paddingHorizontal: 24, paddingTop: 32, alignItems: 'center', gap: 24 }}>
          <Text style={{ fontFamily: FONTS.sansBold, fontSize: 26, color: COLORS.textStrong, textAlign: 'center', lineHeight: 34 }}>
            Story published{'\n'}successfully
          </Text>
          <View style={{ width: '100%', backgroundColor: COLORS.fillWeak, borderRadius: 20, padding: 20, gap: 16 }}>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: COLORS.textBase }}>Share this story with friends</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.strokeWeaker, overflow: 'hidden' }}>
              <Text style={{ flex: 1, fontFamily: FONTS.sans, fontSize: 13, color: COLORS.textWeak, paddingHorizontal: 14, paddingVertical: 14 }} numberOfLines={1}>{truncatedUrl}</Text>
              <TouchableOpacity onPress={handleCopy} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, paddingVertical: 14, borderLeftWidth: 1, borderLeftColor: COLORS.strokeWeaker }}>
                {copied ? <Check size={15} color={COLORS.success} strokeWidth={2.5} /> : <Copy size={15} color={COLORS.info} strokeWidth={2} />}
                <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 13, color: copied ? COLORS.success : COLORS.info }}>{copied ? 'Copied!' : 'Copy'}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: COLORS.strokeWeaker }} />
              <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: COLORS.textMuted }}>Or share on social media</Text>
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
            <Text style={{ fontFamily: FONTS.sansBold, fontSize: 16, color: COLORS.textInverse }}>Add another story</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDismiss} activeOpacity={0.7} style={{ paddingVertical: 12, paddingHorizontal: 24 }}>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 15, color: COLORS.textBase, textAlign: 'center' }}>Dismiss</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </ImageBackground>
  );
}

// ─── Publish modal (story mode) ───────────────────────────────────────────────

function PublishModal({ visible, title, body, attachmentIds, onClose, memoryId }: {
  visible: boolean; title: string; body: string; attachmentIds: string[];
  onClose: () => void; memoryId?: string;
}) {
  const insets = useSafeAreaInsets();
  const [tags, setTags] = useState('');
  const [selectedBeneficiaryIds, setSelectedBeneficiaryIds] = useState<string[]>([]);
  const [beneficiaryMenuOpen, setBeneficiaryMenuOpen] = useState(false);
  const [isAutotagging, setIsAutotagging] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

  const isEditMode = !!memoryId;
  const { mutate: createMemory, isPending: createPending } = useCreateMemory();
  const { mutate: updateMemory, isPending: updatePending } = useUpdateMemory(memoryId ?? '');
  const isPending = isEditMode ? updatePending : createPending;
  const { data: beneficiariesRaw } = useBeneficiaries();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const beneficiaries: IBeneficiary[] = useMemo(() => {
    if (!beneficiariesRaw) return [];
    if (Array.isArray(beneficiariesRaw)) return beneficiariesRaw;
    if ((beneficiariesRaw as any)?.docs) return (beneficiariesRaw as any).docs;
    return [];
  }, [beneficiariesRaw]);

  const visibilityLabel = useMemo(() => {
    if (!selectedBeneficiaryIds.length) return 'Everyone';
    const names = beneficiaries.filter(b => b._id && selectedBeneficiaryIds.includes(b._id!)).map(b => b.name).filter(Boolean);
    return names.length === 1 ? names[0] : `${names.length} beneficiaries`;
  }, [selectedBeneficiaryIds, beneficiaries]);

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

  const handlePost = useCallback(() => {
    if (!title.trim() && !body.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
    const payload = {
      title: title || 'Untitled', body, tags: tagList, status: 'save' as const,
      attachments: attachmentIds.length ? attachmentIds : undefined,
      beneficiaries: selectedBeneficiaryIds.length ? selectedBeneficiaryIds : undefined,
    };
    const onSuccess = (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.memoriesStats });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (isEditMode) {
        // Edit: show a success toast and close — no share screen
        toast('Story updated successfully', 'success');
        onClose();
      } else {
        const id = res?.data?._id ?? res?.data?.data?._id ?? '';
        setPublishedUrl(id ? `${PUBLISHED_BASE_URL}/${id}` : PUBLISHED_BASE_URL);
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
  }, [title, body, tags, attachmentIds, selectedBeneficiaryIds, isEditMode, createMemory, updateMemory, queryClient, toast, onClose]);

  const handleClose = useCallback(() => {
    setPublishedUrl(null); setTags(''); setSelectedBeneficiaryIds([]); setBeneficiaryMenuOpen(false); onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleClose}>
      <SafeAreaProvider>
        <SafeAreaView style={[{ flex: 1, backgroundColor: COLORS.background }, publishedUrl ? { backgroundColor: 'transparent' } : null]} edges={publishedUrl ? [] : ['top']}>
          {publishedUrl ? (
            <PublishSuccessView publishedUrl={publishedUrl} onAddAnother={handleClose} onDismiss={handleClose} />
          ) : (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <Text style={{ fontFamily: FONTS.serif, fontSize: 22, color: COLORS.textStrong }}>Publish post</Text>
                <TouchableOpacity onPress={handleClose} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.fillWeak, alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} color={COLORS.textBase} strokeWidth={2} />
                </TouchableOpacity>
              </View>
              <View style={{ backgroundColor: COLORS.fillWeak, borderRadius: 16, padding: 16, marginBottom: 24 }}>
                <Text style={{ fontFamily: FONTS.sansBold, fontSize: 15, color: COLORS.textStrong, marginBottom: 4 }}>Who can see this story?</Text>
                <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: COLORS.textBase, marginBottom: 14 }}>Stories are visible to all beneficiaries by default.</Text>
                <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setBeneficiaryMenuOpen(o => !o); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1, borderColor: COLORS.strokeWeaker }} activeOpacity={0.8}>
                  <Users size={18} color={COLORS.textBase} strokeWidth={1.8} />
                  <Text style={{ flex: 1, fontFamily: FONTS.sansMedium, fontSize: 14, color: COLORS.textStrong }}>{visibilityLabel}</Text>
                  <ChevronDown size={16} color={COLORS.textMuted} strokeWidth={2} />
                </TouchableOpacity>
                {beneficiaryMenuOpen && (
                  <View style={{ marginTop: 8, backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.strokeWeaker, paddingVertical: 4 }}>
                    <TouchableOpacity onPress={() => { setSelectedBeneficiaryIds([]); setBeneficiaryMenuOpen(false); Haptics.selectionAsync(); }}
                      style={[{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, marginHorizontal: 4 }, !selectedBeneficiaryIds.length && { backgroundColor: `${COLORS.brand}12` }]}>
                      <Text style={[{ fontFamily: FONTS.sans, fontSize: 14, color: COLORS.textStrong }, !selectedBeneficiaryIds.length && { color: COLORS.brand, fontFamily: FONTS.sansMedium }]}>Everyone</Text>
                    </TouchableOpacity>
                    {beneficiaries.map(b => {
                      if (!b._id) return null;
                      const on = selectedBeneficiaryIds.includes(b._id);
                      return (
                        <TouchableOpacity key={b._id} onPress={() => { Haptics.selectionAsync(); setSelectedBeneficiaryIds(prev => on ? prev.filter(x => x !== b._id) : [...prev, b._id!]); }}
                          style={[{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, marginHorizontal: 4 }, on && { backgroundColor: `${COLORS.brand}12` }]}>
                          <Text style={[{ fontFamily: FONTS.sans, fontSize: 14, color: COLORS.textStrong }, on && { color: COLORS.brand, fontFamily: FONTS.sansMedium }]}>{b.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
              <View style={{ marginBottom: 32 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ fontFamily: FONTS.sansBold, fontSize: 15, color: COLORS.textStrong }}>Add Tags</Text>
                  <TouchableOpacity onPress={handleAutotag} disabled={isAutotagging} activeOpacity={0.8}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: `${COLORS.info}40`, backgroundColor: `${COLORS.info}08` }}>
                    {isAutotagging ? <ActivityIndicator size="small" color={COLORS.info} /> : <Sparkles size={13} color={COLORS.info} strokeWidth={2} />}
                    <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 12, color: COLORS.info }}>Autotag</Text>
                  </TouchableOpacity>
                </View>
                <TextInput value={tags} onChangeText={setTags} placeholder="Manually enter tags or use the autotag button" placeholderTextColor={COLORS.textMuted} returnKeyType="done"
                  style={{ backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.strokeWeaker, paddingHorizontal: 14, paddingVertical: 14, fontFamily: FONTS.sans, fontSize: 14, color: COLORS.textStrong, minHeight: 50 }} />
              </View>
              <TouchableOpacity onPress={handlePost} activeOpacity={0.85} disabled={(!title.trim() && !body.trim()) || isPending}
                style={[{ height: 56, borderRadius: 999, backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center' }, ((!title.trim() && !body.trim()) || isPending) && { opacity: 0.45 }]}>
                {isPending ? <ActivityIndicator color={COLORS.textInverse} /> : <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 16, color: COLORS.textInverse }}>Post now</Text>}
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

// ─── Main Editor Screen ───────────────────────────────────────────────────────

export default function EditorScreen() {
  const router = useRouter();
  const { mode: rawMode, memoryId, initialData } = useLocalSearchParams<{
    mode?: string; memoryId?: string; initialData?: string;
  }>();
  const mode = (rawMode === 'quick-capture' ? 'quick-capture' : 'story') as 'story' | 'quick-capture';
  const isStory = mode === 'story';
  const isEditing = !!memoryId;

  const user = useUserStore(s => s.user);
  const titleRef = useRef<TextInput>(null);
  const bodyRef = useRef<TextInput>(null);
  const isMountedRef = useRef(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Story state
  const [title, setTitle] = useState('');
  const [storyBody, setStoryBody] = useState('');
  const [savedStatus, setSavedStatus] = useState<'saved'|'saving'|'unsaved'>('saved');
  const [showPublish, setShowPublish] = useState(false);

  // Quick-capture state
  const [qcBody, setQcBody] = useState('');
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Shared
  const [selectedBeneficiaryIds, setSelectedBeneficiaryIds] = useState<string[]>([]);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);

  const { mutate: createMemory } = useCreateMemory();
  const { mutateAsync: quickCapture, isPending: qcPending } = useQuickCapture();
  const { mutateAsync: uploadFileMutation } = useFileUpload();
  const { data: beneficiariesRaw } = useBeneficiaries();
  const { start: startRecording, stop: stopRecording, isRecording, duration: recDuration } = useAudioRecorder();
  const { toast } = useToast();

  const beneficiaries: IBeneficiary[] = useMemo(() => {
    if (!beneficiariesRaw) return [];
    if (Array.isArray(beneficiariesRaw)) return beneficiariesRaw;
    if ((beneficiariesRaw as any)?.docs) return (beneficiariesRaw as any).docs;
    return [];
  }, [beneficiariesRaw]);

  useEffect(() => { return () => { isMountedRef.current = false; if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }; }, []);

  // Load drafts / pre-populate from edit params
  useEffect(() => {
    if (isEditing && initialData) {
      // Edit mode — decode full memory JSON seeded by handleEdit
      try {
        const d = JSON.parse(decodeURIComponent(initialData));
        if (d.title) setTitle(d.title);
        if (d.body)  setStoryBody(d.body);
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
    } else if (!isEditing) {
      AsyncStorage.getItem(STORY_DRAFT_KEY(user?.email)).then(raw => {
        if (!raw || !isMountedRef.current) return;
        try { const d = JSON.parse(raw); if (d.title) setTitle(d.title); if (d.body) setStoryBody(d.body); } catch {}
      });
      AsyncStorage.getItem(QC_DRAFT_KEY(user?.email)).then(raw => {
        if (!raw || !isMountedRef.current) return;
        try { const d = JSON.parse(raw); if (d.body) setQcBody(d.body); } catch {}
      });
    }
    const t = setTimeout(() => { (isStory ? titleRef : bodyRef).current?.focus(); }, 200);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave story draft
  const scheduleSave = useCallback((t: string, b: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSavedStatus('saving');
    saveTimerRef.current = setTimeout(() => {
      const key = STORY_DRAFT_KEY(user?.email);
      if (t.trim() || b.trim()) {
        AsyncStorage.setItem(key, JSON.stringify({ title: t, body: b }))
          .then(() => { if (isMountedRef.current) setSavedStatus('saved'); })
          .catch(() => { if (isMountedRef.current) setSavedStatus('unsaved'); });
      } else { AsyncStorage.removeItem(key).catch(() => {}); if (isMountedRef.current) setSavedStatus('saved'); }
    }, 1200);
  }, [user?.email]);

  // Upload helper
  const uploadAndAdd = useCallback(async (uri: string, mimeType: string, name: string, opts?: { isVoice?: boolean; duration?: number }) => {
    const clientId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setAttachments(prev => [...prev, { clientId, fileId: '', uri, name, mimeType, isVoice: opts?.isVoice, duration: opts?.duration, isUploading: true }]);
    try {
      const result = await uploadFileMutation({ uri, type: mimeType, name });
      if (!isMountedRef.current) return;
      if (result?._id) setAttachments(prev => prev.map(a => a.clientId === clientId ? { ...a, fileId: result._id, isUploading: false, file: result } : a));
      else { setAttachments(prev => prev.filter(a => a.clientId !== clientId)); toast('Failed to upload attachment', 'error'); }
    } catch { if (isMountedRef.current) { setAttachments(prev => prev.filter(a => a.clientId !== clientId)); toast('Failed to upload attachment', 'error'); } }
  }, [uploadFileMutation, toast]);

  const handleImagePicker = useCallback(async () => {
    Haptics.selectionAsync();
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow Memento to access your photos.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.85 });
    if (!result.canceled) await Promise.all(result.assets.map(a => uploadAndAdd(a.uri, a.mimeType || 'image/jpeg', a.fileName || `photo_${Date.now()}.jpg`)));
  }, [uploadAndAdd]);

  const handleVideoPicker = useCallback(async () => {
    Haptics.selectionAsync();
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow Memento to access your photos.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsMultipleSelection: false, quality: 0.85 });
    if (!result.canceled && result.assets[0]) { const a = result.assets[0]; await uploadAndAdd(a.uri, a.mimeType || 'video/mp4', a.fileName || `video_${Date.now()}.mp4`); }
  }, [uploadAndAdd]);

  const handleAudioFile = useCallback(async () => {
    Haptics.selectionAsync();
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: FILE_INPUT_MIME, copyToCacheDirectory: true });
      if (!result.canceled && result.assets[0]) { const a = result.assets[0]; if (a.size && a.size > MAX_FILE_BYTES) { toast(`File exceeds ${MAX_FILE_MB}MB limit`, 'error'); return; } await uploadAndAdd(a.uri, a.mimeType || 'application/octet-stream', a.name); }
    } catch {}
  }, [uploadAndAdd, toast]);

  const handleVoice = useCallback(async () => {
    if (isRecording) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); const uri = await stopRecording(); if (uri) await uploadAndAdd(uri, 'audio/m4a', `voice_${Date.now()}.m4a`, { isVoice: true, duration: recDuration }); }
    else { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); await startRecording(); }
  }, [isRecording, stopRecording, startRecording, recDuration, uploadAndAdd]);

  const handleSave = useCallback(async () => {
    const uploadedIds = attachments.filter(a => a.fileId && !a.isUploading).map(a => a.fileId);
    setSaveError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await quickCapture({ body: qcBody.trim(), attachments: uploadedIds.length ? uploadedIds : undefined, beneficiaries: selectedBeneficiaryIds.length ? selectedBeneficiaryIds : undefined });
      AsyncStorage.removeItem(QC_DRAFT_KEY(user?.email)).catch(() => {});
      toast('Got it. Processing in the background…', 'success');
      router.back();
    } catch (err: any) { setSaveError(err?.message ?? 'Could not save. Try again.'); }
  }, [attachments, quickCapture, qcBody, selectedBeneficiaryIds, router, user?.email, toast]);

  const visibilityLabel = useMemo(() => {
    if (!selectedBeneficiaryIds.length) return 'Everyone can see this';
    const names = beneficiaries.filter(b => b._id && selectedBeneficiaryIds.includes(b._id!)).map(b => b.name).filter(Boolean);
    return names.length === 1 ? `Shared with ${names[0]}` : `Shared with ${names.length} people`;
  }, [selectedBeneficiaryIds, beneficiaries]);

  const storyHasContent = title.trim().length > 0 || storyBody.trim().length > 0;
  const uploadedIds = attachments.filter(a => a.fileId && !a.isUploading).map(a => a.fileId);
  const anyUploading = attachments.some(a => a.isUploading);
  const qcHasContent = qcBody.trim().length > 0 || uploadedIds.length > 0;
  const canSave = qcHasContent && !anyUploading && !qcPending && !isRecording;

  const savedDotColor = savedStatus === 'saved' ? COLORS.success : savedStatus === 'saving' ? COLORS.warning : COLORS.error;
  const savedLabel = savedStatus === 'saved' ? 'Saved' : savedStatus === 'saving' ? 'Saving…' : 'Unsaved';

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>

          {/* ── Header ── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
            <TouchableOpacity onPress={() => {
              Haptics.selectionAsync();
              // Save QC draft before dismissing
              if (!isStory && qcBody.trim()) {
                AsyncStorage.setItem(QC_DRAFT_KEY(user?.email), JSON.stringify({ body: qcBody.trim() })).catch(() => {});
              }
              router.back();
            }} activeOpacity={0.7}
              style={{ height: 34, paddingHorizontal: 16, borderRadius: 999, backgroundColor: COLORS.fillWeak, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: FONTS.sans, fontSize: 14, color: COLORS.textBase }}>Cancel</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {isStory && (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: COLORS.fillWeaker }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: savedDotColor }} />
                    <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: COLORS.textMuted }}>{savedLabel}</Text>
                  </View>
                  <TouchableOpacity onPress={() => {
                    Haptics.selectionAsync();
                    Alert.alert('Story options', undefined, [
                      {
                        text: 'Load saved draft',
                        onPress: () => {
                          AsyncStorage.getItem(STORY_DRAFT_KEY(user?.email)).then(raw => {
                            if (!raw) { Alert.alert('No draft', 'No saved draft found.'); return; }
                            try {
                              const d = JSON.parse(raw);
                              if (d.title) setTitle(d.title);
                              if (d.body) setStoryBody(d.body);
                            } catch {}
                          });
                        },
                      },
                      {
                        text: 'Delete draft',
                        style: 'destructive',
                        onPress: () => {
                          AsyncStorage.removeItem(STORY_DRAFT_KEY(user?.email)).catch(() => {});
                          setTitle('');
                          setStoryBody('');
                          setSavedStatus('saved');
                        },
                      },
                      { text: 'Cancel', style: 'cancel' },
                    ]);
                  }} activeOpacity={0.7}
                    style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.fillWeak, alignItems: 'center', justifyContent: 'center' }}>
                    <MoreHorizontal size={16} color={COLORS.textBase} strokeWidth={2} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { if (!storyHasContent || anyUploading) return; Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowPublish(true); }}
                    disabled={!storyHasContent || anyUploading} activeOpacity={0.8}
                    style={[{ height: 34, paddingHorizontal: 18, borderRadius: 999, backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }, (!storyHasContent || anyUploading) && { opacity: 0.4 }]}>
                    {anyUploading && <ActivityIndicator size="small" color={COLORS.textInverse} />}
                    <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 14, color: COLORS.textInverse }}>Next</Text>
                  </TouchableOpacity>
                </>
              )}
              {!isStory && qcHasContent && (
                <TouchableOpacity onPress={handleSave} disabled={!canSave || qcPending} activeOpacity={0.7}
                  style={{ height: 34, paddingHorizontal: 16, borderRadius: 17, backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center' }}>
                  {qcPending ? <ActivityIndicator size="small" color={COLORS.textInverse} /> : <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 14, color: COLORS.textInverse }}>Save</Text>}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── Content ── */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {isStory ? (
              <>
                <TextInput ref={titleRef} value={title} onChangeText={v => { setTitle(v); scheduleSave(v, storyBody); }}
                  placeholder="Title" placeholderTextColor={COLORS.textDisabled}
                  style={{ fontFamily: FONTS.serif, fontSize: 34, fontWeight: '700', color: COLORS.textStrong, padding: 0, margin: 0, marginBottom: 8, lineHeight: 42 }}
                  returnKeyType="next" onSubmitEditing={() => bodyRef.current?.focus()} blurOnSubmit={false} />
                <TextInput ref={bodyRef} value={storyBody} onChangeText={v => { setStoryBody(v); scheduleSave(title, v); }}
                  placeholder="Start writing your article…" placeholderTextColor={COLORS.textDisabled}
                  style={{ fontFamily: FONTS.sans, fontSize: 16, color: COLORS.textBase, padding: 0, margin: 0, lineHeight: 26, textAlignVertical: 'top' }}
                  multiline numberOfLines={2} blurOnSubmit={false} scrollEnabled={false} textAlignVertical="top" />
                {/* Attachment previews — story mode */}
                {(() => {
                  const imgAttachments = attachments.filter(a => a.mimeType.startsWith('image/'));
                  if (!imgAttachments.length) return null;
                  return (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 16 }}>
                      {imgAttachments.slice(0, 6).map((a, idx) => {
                        const isLast = idx === 5 && imgAttachments.length > 6;
                        const globalIdx = attachments.findIndex(x => x.clientId === a.clientId);
                        return (
                          <TouchableOpacity key={a.clientId} activeOpacity={0.85}
                            onPress={() => { setPreviewIndex(globalIdx >= 0 ? globalIdx : idx); setPreviewVisible(true); Haptics.selectionAsync(); }}
                            style={{ width: '31.5%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
                            <Image source={{ uri: a.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                            {isLast && (
                              <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontFamily: FONTS.sansBold, fontSize: 16, color: '#fff' }}>+{imgAttachments.length - 6}</Text>
                              </View>
                            )}
                            {a.isUploading && (
                              <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}>
                                <ActivityIndicator color={COLORS.textInverse} />
                              </View>
                            )}
                            <TouchableOpacity onPress={(e) => { e.stopPropagation(); Haptics.selectionAsync(); setAttachments(prev => prev.filter(x => x.clientId !== a.clientId)); }}
                              style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
                              <X size={10} color={COLORS.textInverse} strokeWidth={2.5} />
                            </TouchableOpacity>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })()}
                {attachments.filter(a => a.isVoice).map(a => {
                  const dur = a.duration ?? 0;
                  return (
                    <View key={a.clientId} style={{ marginTop: 8, backgroundColor: COLORS.textStrong, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Music size={14} color={COLORS.textInverse} strokeWidth={1.8} />
                      <Text style={{ flex: 1, fontFamily: FONTS.sans, fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>Voice · {Math.floor(dur/60)}:{String(Math.floor(dur%60)).padStart(2,'0')}</Text>
                      {a.isUploading && <ActivityIndicator size="small" color={COLORS.textInverse} />}
                      <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setAttachments(prev => prev.filter(x => x.clientId !== a.clientId)); }} hitSlop={8}>
                        <X size={12} color="rgba(255,255,255,0.7)" strokeWidth={2} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
                {attachments.filter(a => !a.mimeType.startsWith('image/') && !a.isVoice).map(a => (
                  <View key={a.clientId} style={{ marginTop: 6, backgroundColor: COLORS.fillWeak, borderRadius: 12, borderWidth: 1, borderColor: COLORS.strokeWeaker, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <FileText size={14} color={COLORS.brand} strokeWidth={1.8} />
                    <Text style={{ flex: 1, fontFamily: FONTS.sans, fontSize: 13, color: COLORS.textStrong }} numberOfLines={1}>{a.name}</Text>
                    {a.isUploading && <ActivityIndicator size="small" color={COLORS.brand} />}
                    <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setAttachments(prev => prev.filter(x => x.clientId !== a.clientId)); }} hitSlop={8}>
                      <X size={12} color={COLORS.textWeak} strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            ) : (
              <>
                <TextInput ref={bodyRef} value={qcBody} onChangeText={v => setQcBody(v.slice(0, NOTE_CHAR_MAX))}
                  placeholder="What's on your mind?" placeholderTextColor={isRecording ? COLORS.error : COLORS.textMuted}
                  style={{ fontFamily: FONTS.sans, fontSize: 16, lineHeight: 24, color: COLORS.textStrong, padding: 0, margin: 0, textAlignVertical: 'top' }}
                  multiline numberOfLines={2} autoFocus blurOnSubmit={false} scrollEnabled={false} maxLength={NOTE_CHAR_MAX} />
                {isRecording && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.error }} />
                    <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 11, color: COLORS.error }}>{Math.floor(recDuration/60)}:{String(recDuration%60).padStart(2,'0')} · Tap mic to finish</Text>
                  </View>
                )}
                {/* Attachment previews */}
                {(() => {
                  const imgAttachments = attachments.filter(a => a.mimeType.startsWith('image/'));
                  if (!imgAttachments.length) return null;
                  return (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                      {imgAttachments.slice(0, 6).map((a, idx) => {
                        const isLast = idx === 5 && imgAttachments.length > 6;
                        const globalIdx = attachments.findIndex(x => x.clientId === a.clientId);
                        return (
                          <TouchableOpacity key={a.clientId} activeOpacity={0.85}
                            onPress={() => { setPreviewIndex(globalIdx >= 0 ? globalIdx : idx); setPreviewVisible(true); Haptics.selectionAsync(); }}
                            style={{ width: '31.5%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
                            <Image source={{ uri: a.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                            {isLast && (
                              <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontFamily: FONTS.sansBold, fontSize: 16, color: '#fff' }}>+{imgAttachments.length - 6}</Text>
                              </View>
                            )}
                            {a.isUploading && (
                              <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}>
                                <ActivityIndicator color={COLORS.textInverse} />
                              </View>
                            )}
                            <TouchableOpacity onPress={(e) => { e.stopPropagation(); Haptics.selectionAsync(); setAttachments(prev => prev.filter(x => x.clientId !== a.clientId)); }}
                              style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
                              <X size={10} color={COLORS.textInverse} strokeWidth={2.5} />
                            </TouchableOpacity>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })()}
                {attachments.filter(a => a.isVoice).map(a => {
                  const dur = a.duration ?? 0;
                  return (
                    <View key={a.clientId} style={{ marginTop: 8, backgroundColor: COLORS.textStrong, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Music size={14} color={COLORS.textInverse} strokeWidth={1.8} />
                      <Text style={{ flex: 1, fontFamily: FONTS.sans, fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
                        Voice · {Math.floor(dur/60)}:{String(Math.floor(dur%60)).padStart(2,'0')}
                      </Text>
                      {a.isUploading && <ActivityIndicator size="small" color={COLORS.textInverse} />}
                      <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setAttachments(prev => prev.filter(x => x.clientId !== a.clientId)); }} hitSlop={8}>
                        <X size={12} color="rgba(255,255,255,0.7)" strokeWidth={2} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
                {attachments.filter(a => !a.mimeType.startsWith('image/') && !a.isVoice).map(a => (
                  <View key={a.clientId} style={{ marginTop: 6, backgroundColor: COLORS.fillWeak, borderRadius: 12, borderWidth: 1, borderColor: COLORS.strokeWeaker, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <FileText size={14} color={COLORS.brand} strokeWidth={1.8} />
                    <Text style={{ flex: 1, fontFamily: FONTS.sans, fontSize: 13, color: COLORS.textStrong }} numberOfLines={1}>{a.name}</Text>
                    {a.isUploading && <ActivityIndicator size="small" color={COLORS.brand} />}
                    <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setAttachments(prev => prev.filter(x => x.clientId !== a.clientId)); }} hitSlop={8}>
                      <X size={12} color={COLORS.textWeak} strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                ))}
                {saveError && <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: COLORS.error, marginTop: 8 }}>{saveError}</Text>}
              </>
            )}
          </ScrollView>

          {/* ── Privacy (quick-capture only) ── */}
          {!isStory && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.strokeWeaker }}>
                <Globe size={14} color={COLORS.textMuted} strokeWidth={1.8} />
                <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setPrivacyOpen(o => !o); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: COLORS.textMuted }}>{visibilityLabel}</Text>
                  <ChevronDown size={12} color={COLORS.textMuted} strokeWidth={2} />
                </TouchableOpacity>
              </View>
              {privacyOpen && (
                <View style={{ marginHorizontal: 16, marginBottom: 4, backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.strokeWeaker, paddingVertical: 4, maxHeight: 180 }}>
                  <TouchableOpacity onPress={() => { setSelectedBeneficiaryIds([]); setPrivacyOpen(false); Haptics.selectionAsync(); }}
                    style={[{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginHorizontal: 4 }, !selectedBeneficiaryIds.length && { backgroundColor: `${COLORS.brand}12` }]}>
                    <Text style={[{ fontFamily: FONTS.sans, fontSize: 14, color: COLORS.textStrong }, !selectedBeneficiaryIds.length && { color: COLORS.brand }]}>Everyone</Text>
                  </TouchableOpacity>
                  {beneficiaries.map(b => {
                    if (!b._id) return null;
                    const on = selectedBeneficiaryIds.includes(b._id);
                    return (
                      <TouchableOpacity key={b._id} onPress={() => { Haptics.selectionAsync(); setSelectedBeneficiaryIds(prev => on ? prev.filter(x => x !== b._id) : [...prev, b._id!]); }}
                        style={[{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginHorizontal: 4 }, on && { backgroundColor: `${COLORS.brand}12` }]}>
                        <Text style={[{ fontFamily: FONTS.sans, fontSize: 14, color: COLORS.textStrong }, on && { color: COLORS.brand }]}>{b.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {/* ── Action bar ── */}
          <EditorActionBar
            mode={mode}
            disableModeSwitch={isEditing}
            onSwitchMode={() => {
              if (isEditing) return;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.setParams({ mode: isStory ? 'quick-capture' : 'story' });
              // Re-focus input after mode switch
              setTimeout(() => { (isStory ? bodyRef : titleRef).current?.focus(); }, 100);
            }}
            onPhoto={handleImagePicker}
            onCamera={handleVideoPicker}
            onAudio={handleVoice}
            onFile={handleAudioFile}
            isRecording={isRecording}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>

      {isStory && (
        <PublishModal
          visible={showPublish}
          title={title}
          body={storyBody}
          attachmentIds={uploadedIds}
          memoryId={memoryId}
          onClose={() => {
            setShowPublish(false);
            // After editing, go back to the story detail screen
            if (isEditing) router.back();
          }}
        />
      )}

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
    </SafeAreaProvider>
  );
}
