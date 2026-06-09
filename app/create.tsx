/**
 * app/create.tsx — Quick Capture full-screen compose
 *
 * Data parity with web /memories/quick-capture:
 *  - body (plain text, 8,000 char max)
 *  - attachments[] — images/videos (gallery), audio files, voice recording, documents
 *  - beneficiaries[] — "Everyone" or specific people
 *  - Draft auto-saved to AsyncStorage on dismiss if has content
 *
 * Toolbar matches web: Image | Video | Music | Mic | Smile
 */
import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Globe,
  ChevronDown,
  X,
  FileText,
  Play,
  Camera,
  Mic,
  Video,
  Music,
} from 'lucide-react-native';
import { EditorActionBar } from '@/components/ui/EditorActionBar';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, SlideInUp } from 'react-native-reanimated';

// Module-level flag — SlideInUp only on the very first mount per session.
let createHasSlid = false;
import { COLORS, FONTS } from '@/constants/tokens';
import { useUserStore } from '@/store';
import { useQuickCapture } from '@/hooks/mutations/use-quick-capture';
import { useFileUpload } from '@/hooks/mutations/use-file-upload';
import { useBeneficiaries } from '@/hooks/queries/use-beneficiaries';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';
import { useToast } from '@/components/ui/Toast';
import type { IBeneficiary, IFile } from '@/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const NOTE_CHAR_MAX = 8000;
const MAX_FILE_MB = 15;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

const DRAFT_STORAGE_KEY = (email?: string | null) => `qc_draft_${email ?? 'anon'}`;

// Common emojis — no external library needed
const EMOJI_ROWS = [
  ['😊', '😄', '😍', '🥰', '😂', '🤣', '😭', '😢'],
  ['❤️', '🔥', '✨', '🎉', '👏', '🙌', '💯', '🤔'],
  ['😅', '🥹', '😎', '🤩', '🫶', '💪', '👍', '🙏'],
  ['🌟', '💡', '📝', '🎯', '🚀', '🌈', '☀️', '🌙'],
];

// Audio file types matching web
const AUDIO_INPUT_MIME = [
  'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4',
  'audio/aac', 'audio/flac', 'audio/ogg', 'audio/*',
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttachmentItem {
  clientId: string;
  fileId: string;
  uri: string;
  name: string;
  mimeType: string;
  duration?: number;
  isVoice?: boolean;
  isUploading?: boolean;
  file?: IFile;
}

// ─── Char ring ────────────────────────────────────────────────────────────────

function CharRing({ value, max }: { value: number; max: number }) {
  const pct = Math.min(1, value / max);
  const nearLimit = pct > 0.8;
  const atLimit = pct >= 1;
  const color = atLimit ? COLORS.error : nearLimit ? COLORS.warning : COLORS.brand;
  const SIZE = 26;
  const R = 9;
  const CIRC = 2 * Math.PI * R;

  // React Native doesn't support SVG natively — use a simple progress ring with Views
  // We approximate using a circular border approach
  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: SIZE, height: SIZE, borderRadius: SIZE / 2,
        borderWidth: 2.5, borderColor: COLORS.strokeWeak,
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {/* Filled arc approximated by a colored border on a rotating view */}
        <View style={{
          position: 'absolute', width: SIZE, height: SIZE,
          borderRadius: SIZE / 2,
          borderWidth: 2.5,
          borderColor: 'transparent',
          borderTopColor: pct > 0 ? color : 'transparent',
          borderRightColor: pct > 0.25 ? color : 'transparent',
          borderBottomColor: pct > 0.5 ? color : 'transparent',
          borderLeftColor: pct > 0.75 ? color : 'transparent',
        }} />
      </View>
      {nearLimit && (
        <Text style={{
          position: 'absolute',
          fontFamily: FONTS.sansBold, fontSize: 7, color,
        }}>
          {max - value}
        </Text>
      )}
    </View>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function UserAvatar({ user }: { user: { first_name?: string; picture_url?: string; picture?: string } | null }) {
  const uri = user?.picture_url || user?.picture;
  const initial = user?.first_name?.charAt(0).toUpperCase() ?? '?';
  if (uri) return <Image source={{ uri }} style={styles.avatar} />;
  return (
    <View style={[styles.avatar, styles.avatarFallback]}>
      <Text style={styles.avatarInitial}>{initial}</Text>
    </View>
  );
}

// ─── Attachment cards ─────────────────────────────────────────────────────────

function ImageGrid({ items, onRemove }: { items: AttachmentItem[]; onRemove: (id: string) => void }) {
  if (!items.length) return null;
  const single = items.length === 1;
  return (
    <View style={[styles.imageGrid, { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }]}>
      {items.slice(0, 4).map((item, idx) => {
        const isLast = idx === 3 && items.length > 4;
        const flex = single ? 1 : items.length === 3 && idx === 2 ? 1 : 0.48;
        return (
          <View key={item.clientId} style={{ flex, aspectRatio: single ? undefined : 1, maxHeight: single ? 200 : undefined, position: 'relative' }}>
            <Image source={{ uri: item.uri }} style={{ width: '100%', height: single ? 200 : '100%', borderRadius: 12 }} resizeMode="cover" />
            {isLast && (
              <View style={styles.imgOverlay}>
                <Text style={styles.imgOverlayText}>+{items.length - 4}</Text>
              </View>
            )}
            {item.isUploading && (
              <View style={styles.imgOverlay}><ActivityIndicator color={COLORS.textInverse} /></View>
            )}
            <TouchableOpacity onPress={() => onRemove(item.clientId)} style={styles.removeBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <X size={8} color={COLORS.textStrong} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

function VoiceCard({ item, onRemove }: { item: AttachmentItem; onRemove: (id: string) => void }) {
  const dur = item.duration ?? 0;
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const bars = useMemo(() => {
    let h = 0;
    for (let i = 0; i < item.clientId.length; i++) h = (h * 31 + item.clientId.charCodeAt(i)) | 0;
    return Array.from({ length: 24 }, (_, i) => 4 + Math.round((Math.sin((h + i * 997) * 0.013) * 0.5 + 0.5) * 16));
  }, [item.clientId]);
  return (
    <View style={styles.voiceCard}>
      <TouchableOpacity onPress={() => onRemove(item.clientId)} style={styles.voiceRemoveBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
        <X size={8} color="rgba(255,255,255,0.7)" strokeWidth={2.5} />
      </TouchableOpacity>
      <Text style={styles.voiceTitle} numberOfLines={1}>Voice note · {dur > 0 ? fmt(dur) : item.name}</Text>
      <View style={styles.waveform}>
        {bars.map((h, i) => <View key={i} style={[styles.bar, { height: h }]} />)}
      </View>
    </View>
  );
}

function AudioFileCard({ item, onRemove }: { item: AttachmentItem; onRemove: (id: string) => void }) {
  return (
    <View style={styles.fileCard}>
      <Music size={14} color={COLORS.brand} strokeWidth={1.8} />
      <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
      {item.isUploading && <ActivityIndicator size="small" color={COLORS.brand} />}
      <TouchableOpacity onPress={() => onRemove(item.clientId)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
        <X size={12} color={COLORS.textWeak} strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
}

function GenericFileCard({ item, onRemove }: { item: AttachmentItem; onRemove: (id: string) => void }) {
  return (
    <View style={styles.fileCard}>
      <FileText size={14} color={COLORS.textBase} strokeWidth={1.8} />
      <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
      {item.isUploading && <ActivityIndicator size="small" color={COLORS.brand} />}
      <TouchableOpacity onPress={() => onRemove(item.clientId)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
        <X size={12} color={COLORS.textWeak} strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
}

/**
 * VideoCard — shows either:
 * 1. Server thumbnail (item.file?.thumbnail) once upload finishes
 * 2. A dark placeholder tile with Video icon + filename while uploading
 *    (we can't use <Image> to extract a video frame on iOS)
 */
function VideoCard({ item, onRemove }: { item: AttachmentItem; onRemove: (id: string) => void }) {
  // After upload the server may return a thumbnail URL
  const thumbUri = item.file?.thumbnail;
  return (
    <View style={styles.videoCard}>
      {thumbUri ? (
        <Image source={{ uri: thumbUri }} style={styles.videoThumb} resizeMode="cover" />
      ) : (
        <View style={styles.videoPlaceholder}>
          {item.isUploading
            ? <ActivityIndicator color={COLORS.textInverse} />
            : <Play size={28} color="rgba(255,255,255,0.8)" fill="rgba(255,255,255,0.8)" />
          }
        </View>
      )}
      <View style={styles.videoMeta}>
        <Video size={13} color={COLORS.textBase} strokeWidth={1.8} />
        <Text style={styles.videoName} numberOfLines={1}>{item.name}</Text>
        {item.isUploading && !thumbUri && (
          <Text style={styles.videoUploading}>Uploading…</Text>
        )}
      </View>
      <TouchableOpacity onPress={() => onRemove(item.clientId)} style={styles.videoRemoveBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
        <X size={8} color={COLORS.textStrong} strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Emoji picker ─────────────────────────────────────────────────────────────

function EmojiPicker({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) {
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.emojiBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.emojiPicker}>
        {EMOJI_ROWS.map((row, ri) => (
          <View key={ri} style={styles.emojiRow}>
            {row.map((e) => (
              <TouchableOpacity key={e} onPress={() => { onSelect(e); onClose(); }} style={styles.emojiBtn}>
                <Text style={styles.emojiText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </Modal>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function CreateScreen() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const inputRef = useRef<TextInput>(null);
  const isMountedRef = useRef(true);

  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [selectedBeneficiaryIds, setSelectedBeneficiaryIds] = useState<string[]>([]);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { mutateAsync: quickCapture, isPending } = useQuickCapture();
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

  useEffect(() => { return () => { isMountedRef.current = false; }; }, []);

  // ── Focus keyboard on mount (after modal slide-up animation) ──────────────
  useEffect(() => {
    const t = setTimeout(() => { inputRef.current?.focus(); }, 150);
    return () => clearTimeout(t);
  }, []);

  // ── Load draft ─────────────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(DRAFT_STORAGE_KEY(user?.email)).then((raw) => {
      if (!raw || !isMountedRef.current) return;
      try {
        const d = JSON.parse(raw);
        if (typeof d.body === 'string' && d.body.trim()) setBody(d.body);
      } catch { /* ignore */ }
    });
  }, [user?.email]);

  // ── Save draft on unmount ──────────────────────────────────────────────────
  const saveDraft = useCallback(() => {
    const key = DRAFT_STORAGE_KEY(user?.email);
    const t = body.trim();
    if (t) AsyncStorage.setItem(key, JSON.stringify({ body: t })).catch(() => {});
    else AsyncStorage.removeItem(key).catch(() => {});
  }, [body, user?.email]);

  useEffect(() => { return () => saveDraft(); }, [saveDraft]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const uploadedIds = useMemo(
    () => attachments.filter((a) => a.fileId && !a.isUploading).map((a) => a.fileId),
    [attachments],
  );
  const anyUploading = attachments.some((a) => a.isUploading);
  const canSave = (body.trim().length > 0 || uploadedIds.length > 0) && !anyUploading && !isPending && !isRecording;
  const hasContent = body.trim().length > 0 || uploadedIds.length > 0;
  const nearLimit = body.length > NOTE_CHAR_MAX * 0.8;

  const imageAttachments = attachments.filter((a) => a.mimeType.startsWith('image/'));
  const videoAttachments = attachments.filter((a) => a.mimeType.startsWith('video/'));
  const voiceAttachments = attachments.filter((a) => a.isVoice);
  const audioAttachments = attachments.filter((a) => a.mimeType.startsWith('audio/') && !a.isVoice);
  const fileAttachments = attachments.filter((a) => !a.mimeType.startsWith('image/') && !a.mimeType.startsWith('video/') && !a.mimeType.startsWith('audio/'));

  const visibilityLabel = useMemo(() => {
    if (!selectedBeneficiaryIds.length) return 'Everyone can see this';
    const names = beneficiaries.filter((b) => b._id && selectedBeneficiaryIds.includes(b._id)).map((b) => b.name).filter(Boolean);
    if (names.length === 1) return `Shared with ${names[0]}`;
    return `Shared with ${names.length} people`;
  }, [selectedBeneficiaryIds, beneficiaries]);

  // ── Upload helper ──────────────────────────────────────────────────────────
  const uploadAndAdd = useCallback(async (uri: string, mimeType: string, name: string, opts?: { isVoice?: boolean; duration?: number }) => {
    const clientId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setAttachments((prev) => [...prev, { clientId, fileId: '', uri, name, mimeType, isVoice: opts?.isVoice, duration: opts?.duration, isUploading: true }]);
    try {
      const result = await uploadFileMutation({ uri, type: mimeType, name });
      if (!isMountedRef.current) return;
      if (result?._id) {
        setAttachments((prev) => prev.map((a) => a.clientId === clientId ? { ...a, fileId: result._id, isUploading: false, file: result } : a));
      } else {
        setAttachments((prev) => prev.filter((a) => a.clientId !== clientId));
        toast('Failed to upload attachment', 'error');
      }
    } catch {
      if (isMountedRef.current) {
        setAttachments((prev) => prev.filter((a) => a.clientId !== clientId));
        toast('Failed to upload attachment', 'error');
      }
    }
  }, [uploadFileMutation, toast]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleCancel = useCallback(() => {
    saveDraft(); Haptics.selectionAsync(); router.back();
  }, [router, saveDraft]);

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    setSaveError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await quickCapture({
        body: body.trim(),
        attachments: uploadedIds.length ? uploadedIds : undefined,
        beneficiaries: selectedBeneficiaryIds.length ? selectedBeneficiaryIds : undefined,
      });
      AsyncStorage.removeItem(DRAFT_STORAGE_KEY(user?.email)).catch(() => {});
      toast('Got it. Processing in the background…', 'success');
      router.back();
    } catch (err: any) {
      setSaveError(err?.message ?? 'Could not save. Try again.');
    }
  }, [canSave, quickCapture, body, uploadedIds, selectedBeneficiaryIds, router, user?.email, toast]);

  // Image toolbar button — images + videos from gallery (matches web's Image icon)
  const handleImagePicker = useCallback(async () => {
    Haptics.selectionAsync();
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow Memento to access your photos.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.85 });
    if (!result.canceled) {
      for (const a of result.assets) await uploadAndAdd(a.uri, a.mimeType || 'image/jpeg', a.fileName || `photo_${Date.now()}.jpg`);
    }
  }, [uploadAndAdd]);

  // Video toolbar button — video from gallery (matches web's Video icon)
  const handleVideoPicker = useCallback(async () => {
    Haptics.selectionAsync();
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow Memento to access your photos.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsMultipleSelection: false, quality: 0.85 });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      await uploadAndAdd(a.uri, a.mimeType || 'video/mp4', a.fileName || `video_${Date.now()}.mp4`);
    }
  }, [uploadAndAdd]);

  // Music toolbar button — attach audio file (matches web's Music icon)
  const handleAudioFile = useCallback(async () => {
    Haptics.selectionAsync();
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: AUDIO_INPUT_MIME, copyToCacheDirectory: true });
      if (!result.canceled && result.assets[0]) {
        const a = result.assets[0];
        if (a.size && a.size > MAX_FILE_BYTES) { toast(`File exceeds ${MAX_FILE_MB}MB limit`, 'error'); return; }
        await uploadAndAdd(a.uri, a.mimeType || 'audio/mpeg', a.name);
      }
    } catch { /* user cancelled */ }
  }, [uploadAndAdd, toast]);

  // Mic toolbar button — record voice (matches web's Mic icon)
  const handleVoice = useCallback(async () => {
    if (isRecording) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const uri = await stopRecording();
      if (uri) await uploadAndAdd(uri, 'audio/m4a', `voice_${Date.now()}.m4a`, { isVoice: true, duration: recDuration });
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await startRecording();
    }
  }, [isRecording, stopRecording, startRecording, recDuration, uploadAndAdd]);

  const insertEmoji = useCallback((emoji: string) => {
    setBody((prev) => {
      const next = prev + emoji;
      return next.slice(0, NOTE_CHAR_MAX);
    });
    inputRef.current?.focus();
  }, []);

  const handleRemove = useCallback((clientId: string) => {
    Haptics.selectionAsync();
    setAttachments((prev) => prev.filter((a) => a.clientId !== clientId));
  }, []);

  const toggleBeneficiary = useCallback((id: string) => {
    Haptics.selectionAsync();
    setSelectedBeneficiaryIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    // SafeAreaProvider here is intentional — fullScreenModal creates a new
    // UIViewController that doesn't inherit the root provider's inset measurements.
    // initialWindowMetrics gives this modal its own synchronous safe-area context.
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <SafeAreaView style={styles.root}>
      {showEmoji && <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} />}
      <Animated.View style={{ flex: 1 }} entering={(() => { const anim = createHasSlid ? undefined : SlideInUp.duration(350); createHasSlid = true; return anim; })()}>
      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} activeOpacity={0.7} style={styles.pill}>
            <Text style={styles.pillText}>Cancel</Text>
          </TouchableOpacity>

          <View style={styles.headerRight}>
            {/* Char ring — only when > 80% full */}
            {nearLimit && <CharRing value={body.length} max={NOTE_CHAR_MAX} />}

            {hasContent && (
              <TouchableOpacity onPress={handleSave} activeOpacity={0.7} style={[styles.pill, styles.pillBrand]} disabled={!canSave || isPending}>
                {isPending
                  ? <ActivityIndicator size="small" color={COLORS.textInverse} />
                  : <Text style={[styles.pillText, { color: COLORS.textInverse }]}>Save</Text>}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Scrollable body ──────────────────────────────────────────────── */}
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* User context */}
          <Animated.View entering={FadeInDown.duration(300)} style={styles.userRow}>
            <UserAvatar user={user} />
            <Text style={styles.userName}>{user?.nickname || user?.first_name || 'You'}</Text>
          </Animated.View>

          {/* Primary input */}
          <TextInput
            ref={inputRef}
            value={body}
            onChangeText={(v) => setBody(v.slice(0, NOTE_CHAR_MAX))}
            placeholder="What's on your mind?"
            placeholderTextColor={isRecording ? COLORS.error : COLORS.textMuted}
            multiline
            autoFocus
            style={styles.input}
            blurOnSubmit={false}
            scrollEnabled={false}
            maxLength={NOTE_CHAR_MAX}
          />

          {/* Recording badge */}
          {isRecording && (
            <View style={styles.recBadge}>
              <View style={styles.recDot} />
              <Text style={styles.recText}>{Math.floor(recDuration / 60)}:{String(recDuration % 60).padStart(2, '0')} · Tap mic to finish</Text>
            </View>
          )}

          {/* Attachments */}
          {imageAttachments.length > 0 && <ImageGrid items={imageAttachments} onRemove={handleRemove} />}
          {videoAttachments.map((a) => <VideoCard key={a.clientId} item={a} onRemove={handleRemove} />)}
          {voiceAttachments.map((a) => <VoiceCard key={a.clientId} item={a} onRemove={handleRemove} />)}
          {audioAttachments.map((a) => <AudioFileCard key={a.clientId} item={a} onRemove={handleRemove} />)}
          {fileAttachments.map((a) => <GenericFileCard key={a.clientId} item={a} onRemove={handleRemove} />)}

          {saveError && <Text style={styles.errorText}>{saveError}</Text>}
        </ScrollView>

        {/* ── Privacy row ───────────────────────────────────────────────────── */}
        <View style={styles.privacyRow}>
          <Globe size={14} color={COLORS.textMuted} strokeWidth={1.8} />
          <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setPrivacyOpen((o) => !o); }} style={styles.privacyBtn}>
            <Text style={styles.privacyLabel}>{visibilityLabel}</Text>
            <ChevronDown size={12} color={COLORS.textMuted} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Privacy dropdown */}
        {privacyOpen && (
          <View style={styles.privacyDropdown}>
            <TouchableOpacity onPress={() => { setSelectedBeneficiaryIds([]); setPrivacyOpen(false); Haptics.selectionAsync(); }}
              style={[styles.privacyOption, !selectedBeneficiaryIds.length && styles.privacyOptionActive]}>
              <Text style={[styles.privacyOptionText, !selectedBeneficiaryIds.length && styles.privacyOptionTextActive]}>Everyone</Text>
            </TouchableOpacity>
            {beneficiaries.map((b) => {
              if (!b._id) return null;
              const on = selectedBeneficiaryIds.includes(b._id);
              return (
                <TouchableOpacity key={b._id} onPress={() => toggleBeneficiary(b._id!)} style={[styles.privacyOption, on && styles.privacyOptionActive]}>
                  <Text style={[styles.privacyOptionText, on && styles.privacyOptionTextActive]}>{b.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Switch modes / add media ──────────────────────────────────── */}
        <EditorActionBar
          mode="quick-capture"
          onSwitchMode={() => { router.replace('/article'); }}
          onPhoto={handleImagePicker}
          onCamera={handleVideoPicker}
          onAudio={handleVoice}
          onFile={handleAudioFile}
          isRecording={isRecording}
        />
      </KeyboardAvoidingView>
      </Animated.View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  kav: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pill: {
    height: 34, paddingHorizontal: 16, borderRadius: 17,
    backgroundColor: COLORS.fillWeak, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 6,
  },
  pillBrand: { backgroundColor: COLORS.brand },
  pillText: { fontFamily: FONTS.sansMedium, fontSize: 14, color: COLORS.textStrong },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 16 },

  userRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 16, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontFamily: FONTS.sansBold, fontSize: 18, color: COLORS.textInverse },
  userName: { fontFamily: FONTS.sansSemi, fontSize: 16, color: COLORS.textStrong },

  input: {
    fontFamily: FONTS.sans, fontSize: 16, lineHeight: 24,
    color: COLORS.textStrong, padding: 0, margin: 0, minHeight: 80, textAlignVertical: 'top',
  },

  recBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  recDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.error },
  recText: { fontFamily: FONTS.sansMedium, fontSize: 11, color: COLORS.error },

  imageGrid: { marginTop: 12 },
  imgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  imgOverlayText: { fontFamily: FONTS.sansBold, fontSize: 16, color: '#fff' },
  removeBtn: {
    position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10,
    backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.strokeWeak,
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3 },
      android: { elevation: 2 },
    }),
  },

  voiceCard: { marginTop: 12, backgroundColor: COLORS.textStrong, borderRadius: 16, padding: 14, paddingRight: 36 },
  voiceRemoveBtn: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  voiceTitle: { fontFamily: FONTS.sansMedium, fontSize: 12, color: 'rgba(255,255,255,0.85)', marginBottom: 10 },
  waveform: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar: { flex: 1, borderRadius: 2, backgroundColor: `${COLORS.brand}99`, maxHeight: 24 },

  fileCard: {
    marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.fillWeak, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.strokeWeaker, paddingHorizontal: 12, paddingVertical: 10,
  },
  fileName: { flex: 1, fontFamily: FONTS.sans, fontSize: 13, color: COLORS.textStrong },

  privacyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: COLORS.strokeWeaker,
  },
  privacyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  privacyLabel: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.textMuted },
  privacyDropdown: {
    marginHorizontal: 16, marginBottom: 4, backgroundColor: COLORS.card,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.strokeWeaker, paddingVertical: 4, maxHeight: 180,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  privacyOption: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginHorizontal: 4 },
  privacyOptionActive: { backgroundColor: `${COLORS.brand}12` },
  privacyOptionText: { fontFamily: FONTS.sans, fontSize: 14, color: COLORS.textStrong },
  privacyOptionTextActive: { color: COLORS.brand, fontFamily: FONTS.sansMedium },

  // Bottom toolbar — matches web action bar layout
  toolbar: {
    flexDirection: 'row', alignItems: 'center',
    gap: 20, paddingHorizontal: 20,
    paddingTop: 12, paddingBottom: 12,
    borderTopWidth: 1, borderTopColor: COLORS.strokeWeaker,
    backgroundColor: COLORS.background,
  },

  // Emoji picker
  emojiBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
  emojiPicker: {
    position: 'absolute', bottom: 80, left: 16, right: 16,
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.strokeWeaker,
    padding: 12, zIndex: 100,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 20 },
      android: { elevation: 8 },
    }),
  },
  emojiRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  emojiBtn: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  emojiText: { fontSize: 22 },

  // Video card
  videoCard: {
    marginTop: 12, borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.strokeWeaker,
    backgroundColor: COLORS.fillWeak,
  },
  videoThumb: { width: '100%', height: 160, borderRadius: 12 },
  videoPlaceholder: {
    width: '100%', height: 100, backgroundColor: COLORS.textStrong,
    alignItems: 'center', justifyContent: 'center', borderRadius: 12,
  },
  videoMeta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  videoName: { flex: 1, fontFamily: FONTS.sans, fontSize: 12, color: COLORS.textStrong },
  videoUploading: { fontFamily: FONTS.sans, fontSize: 11, color: COLORS.textMuted },
  videoRemoveBtn: {
    position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
  },

  // Mode bar — "Switch modes or add media files"
  modeBar: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14,
    borderTopWidth: 1, borderTopColor: COLORS.strokeWeaker,
    backgroundColor: COLORS.background,
    gap: 10,
  },
  modeLabel: {
    fontFamily: FONTS.sansBold, fontSize: 10,
    color: COLORS.textMuted, letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  storyModePill: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 14, height: 42,
    borderRadius: 12, backgroundColor: COLORS.brand,
  },
  storyModeText: {
    fontFamily: FONTS.sansSemi, fontSize: 14, color: COLORS.textInverse,
  },
  mediaBtn: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: COLORS.fillWeak,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.strokeWeaker,
  },
  mediaBtnActive: {
    backgroundColor: `${COLORS.error}12`,
    borderColor: `${COLORS.error}30`,
  },

  errorText: { fontFamily: FONTS.sans, fontSize: 13, color: COLORS.error, marginTop: 8, paddingHorizontal: 4 },
});
