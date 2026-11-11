import { Avatar } from "@/components/ui/Avatar";
import { getSheetActionsBottomPadding } from '@/features/layout/sheet-safe-area';
import { PublishSuccessView } from '@/components/editor/PublishSuccessView';
import { useThemeColors, useThemedStyles, useThemeStyles } from '@/hooks/use-theme-colors';
/**
 * app/article.tsx — Full-screen rich-text article editor
 *
 * Publish sheet is rendered in a local React Native Modal so it appears
 * above this fullScreenModal without needing the global SheetManager.
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
  Keyboard,
  Modal,
  ActivityIndicator,
  Share,
} from 'react-native';
import type { ThemeColors } from '@/constants/tokens';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { SafeAreaView, SafeAreaProvider, initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MoreHorizontal from 'lucide-react-native/icons/ellipsis';
import X from 'lucide-react-native/icons/x';
import Users from 'lucide-react-native/icons/users';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import Sparkles from 'lucide-react-native/icons/sparkles';
import { EditorActionBar } from '@/components/ui/EditorActionBar';
import { toast } from '@/components/ui/Toast';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, SlideInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

// Tracks whether this screen has already performed its first slide-up entrance.
// Module-level: persists across router.replace calls in the same session,
// resets on app restart — exactly the right scope.
let articleHasSlid = false;
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { minTouchTarget, radius, iconSize } from '@/constants/responsive';
import { useUserStore } from '@/store';
import { useCreateMemory } from '@/hooks/mutations/use-memory-mutations';
import { useToast } from '@/components/ui/Toast';
import client from '@/api/client';
import endpoint from '@/api/endpoint';
import { publishedPostUrl } from '@/lib/env';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { PublishPrivacySheet, type PrivacyMode } from '@/components/sheets/PublishPrivacySheet';
import { NativeModalSafeAreaBoundary } from '@/components/system/NativeModalSafeAreaBoundary';
import {
  deriveMemoryAudience,
  formatMemoryAudienceLabel,
  type MemoryAudienceSelection,
} from '@/features/memories/memory-audience';
import { buildArticlePublishPayload } from '@/features/editor/article-publish-payload';

const DRAFT_KEY = (email?: string | null) => `article_draft_${email ?? 'anon'}`;
const AUTOSAVE_DELAY_MS = 1200;

// ─── Publish sheet (inline Modal) ────────────────────────────────────────────

function PublishModal({
  visible,
  title,
  subtitle,
  body,
  onClose,
}: {
  visible: boolean;
  title: string;
  subtitle: string;
  body: string;
  onClose: () => void;
}) {
  const COLORS = useThemeColors();
  const pStyles = useThemedStyles(pStylesBase);
  const insets = useSafeAreaInsets();
  const [tags, setTags] = useState('');
  const [audience, setAudience] = useState<MemoryAudienceSelection>(() => deriveMemoryAudience({}));
  const [isAutotagging, setIsAutotagging] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const privacySheetRef = useRef<BottomSheetModal>(null);

  const { mutate: createMemory, isPending } = useCreateMemory();
  const { toast } = useToast();

  const visibilityLabel = useMemo(() => formatMemoryAudienceLabel(audience), [audience]);

  const handleAutotag = useCallback(async () => {
    const bodyText = [title, subtitle, body].filter(Boolean).join(' ').trim();
    if (!bodyText) return;
    setIsAutotagging(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await client.post(endpoint.generateTags, { body: bodyText });
      const generated: string[] = res.data?.data?.tags ?? res.data?.tags ?? [];
      if (generated.length) {
        setTags((prev) => {
          const existing = prev.split(',').map((t) => t.trim()).filter(Boolean);
          const merged = [...new Set([...existing, ...generated])];
          return merged.join(', ');
        });
      }
    } catch {
      toast('Could not generate tags', 'error');
    } finally {
      setIsAutotagging(false);
    }
  }, [title, subtitle, body, toast]);

  const handlePost = useCallback(() => {
    if (!title.trim() && !body.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const tagList = tags.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean);
    createMemory(
      buildArticlePublishPayload({ title, subtitle, body, tags: tagList, audience }),
      {
        onSuccess: (res: any) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          const memoryId = res?.data?._id ?? res?.data?.data?._id ?? '';
          setPublishedUrl(publishedPostUrl(memoryId));
        },
        onError: (err: any) => {
          toast(err?.message ?? 'Could not publish. Try again.', 'error');
        },
      }
    );
  }, [title, subtitle, body, tags, audience, createMemory, toast]);

  // Reset form state when modal closes
  const handleClose = useCallback(() => {
    setPublishedUrl(null);
    setTags('');
    setAudience(deriveMemoryAudience({}));
    onClose();
  }, [onClose]);

  const handlePrivacyModeChange = useCallback((nextMode: PrivacyMode) => {
    setAudience((current) => ({
      ...current,
      mode: nextMode === 'all' ? 'everyone' : nextMode,
    }));
  }, []);

  const handleToggleBeneficiary = useCallback((id: string) => {
    setAudience((current) => ({
      ...current,
      beneficiaryIds: current.beneficiaryIds.includes(id)
        ? current.beneficiaryIds.filter((candidate) => candidate !== id)
        : [...current.beneficiaryIds, id],
    }));
  }, []);

  const handleToggleGroup = useCallback((id: string) => {
    setAudience((current) => ({
      ...current,
      groupIds: current.groupIds.includes(id)
        ? current.groupIds.filter((candidate) => candidate !== id)
        : [...current.groupIds, id],
    }));
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <NativeModalSafeAreaBoundary>
        <SafeAreaView style={[pStyles.root, publishedUrl ? { backgroundColor: 'transparent' } : null]} edges={publishedUrl ? [] : ['top']}>

          {/* ── Success view ── */}
          {publishedUrl ? (
            <PublishSuccessView
              publishedUrl={publishedUrl}
              onAddAnother={() => { handleClose(); }}
              onDismiss={() => { handleClose(); }}
            />
          ) : (

          <ScrollView
            contentContainerStyle={[pStyles.container, { paddingBottom: getSheetActionsBottomPadding(insets.bottom) }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={pStyles.header}>
              <Text style={pStyles.headerTitle}>Publish post</Text>
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                accessibilityLabel="Close publish sheet"
                style={pStyles.closeBtn}
              >
                <X size={iconSize(16)} color={COLORS.textBase} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Visibility card */}
            <View style={pStyles.visibilityCard}>
              <Text style={pStyles.visibilityTitle}>Who can see this story?</Text>
              <Text style={pStyles.visibilitySubtitle}>New stories are private unless you choose otherwise.</Text>
              <TouchableOpacity
                onPress={() => { Haptics.selectionAsync(); privacySheetRef.current?.present(); }}
                style={pStyles.visibilitySelector}
                activeOpacity={0.8}
              >
                <Users size={18} color={COLORS.textBase} strokeWidth={1.8} />
                <Text style={pStyles.visibilitySelectorText}>{visibilityLabel}</Text>
                <ChevronDown size={16} color={COLORS.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Tags */}
            <View style={pStyles.tagsSection}>
              <View style={pStyles.tagsHeader}>
                <Text style={pStyles.tagsTitle}>Add Tags</Text>
                <TouchableOpacity onPress={handleAutotag} activeOpacity={0.8} style={pStyles.autotagBtn} disabled={isAutotagging}>
                  {isAutotagging
                    ? <ActivityIndicator size="small" color={COLORS.brand} />
                    : <Sparkles size={13} color={COLORS.brand} strokeWidth={2} />
                  }
                  <Text style={pStyles.autotagText}>Autotag</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                value={tags}
                onChangeText={setTags}
                placeholder="Manually enter tags or use the autotag button"
                placeholderTextColor={COLORS.textMuted}
                style={pStyles.tagInput}
                returnKeyType="done"
              />
            </View>

            {/* Post now */}
            <TouchableOpacity
              onPress={handlePost}
              activeOpacity={0.85}
              style={[pStyles.postBtn, (!title.trim() && !body.trim() || isPending) && pStyles.postBtnDisabled]}
              disabled={(!title.trim() && !body.trim()) || isPending}
            >
              {isPending
                ? <ActivityIndicator color={COLORS.textInverse} />
                : <Text style={pStyles.postBtnText}>Post now</Text>
              }
            </TouchableOpacity>
          </ScrollView>
          )}
        </SafeAreaView>
        <PublishPrivacySheet
          ref={privacySheetRef}
          mode={audience.mode === 'everyone' ? 'all' : audience.mode}
          selectedBeneficiaryIds={audience.beneficiaryIds}
          selectedGroupIds={audience.groupIds}
          onModeChange={handlePrivacyModeChange}
          onToggleBeneficiary={handleToggleBeneficiary}
          onToggleGroup={handleToggleGroup}
          onApply={(nextMode, beneficiaryIds, groupIds) => {
            setAudience({
              mode: nextMode === 'all' ? 'everyone' : nextMode,
              beneficiaryIds,
              groupIds,
            });
            privacySheetRef.current?.dismiss();
          }}
          onClose={() => privacySheetRef.current?.dismiss()}
        />
      </NativeModalSafeAreaBoundary>
    </Modal>
  );
}

// ─── Main article screen ──────────────────────────────────────────────────────

export default function ArticleScreen() {
  const COLORS = useThemeColors();
  const styles = useThemedStyles(stylesBase);
  const router = useRouter();
  const user = useUserStore((s) => s.user);

  const titleRef = useRef<TextInput>(null);
  const subtitleRef = useRef<TextInput>(null);
  const bodyRef = useRef<TextInput>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [body, setBody] = useState('');
  const [savedStatus, setSavedStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [showPublish, setShowPublish] = useState(false);

  const displayName = user?.nickname || user?.first_name || 'You';
  const avatarUri = user?.picture_url || user?.picture;

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { titleRef.current?.focus(); }, 200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(DRAFT_KEY(user?.email)).then((raw) => {
      if (!raw || !isMountedRef.current) return;
      try {
        const d = JSON.parse(raw);
        if (d.title) setTitle(d.title);
        if (d.subtitle) setSubtitle(d.subtitle);
        if (d.body) setBody(d.body);
      } catch { /* ignore */ }
    });
  }, [user?.email]);

  const scheduleSave = useCallback((t: string, s: string, b: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSavedStatus('saving');
    saveTimerRef.current = setTimeout(() => {
      const key = DRAFT_KEY(user?.email);
      const hasContent = t.trim() || s.trim() || b.trim();
      if (hasContent) {
        AsyncStorage.setItem(key, JSON.stringify({ title: t, subtitle: s, body: b }))
          .then(() => { if (isMountedRef.current) setSavedStatus('saved'); })
          .catch(() => { if (isMountedRef.current) setSavedStatus('unsaved'); });
      } else {
        AsyncStorage.removeItem(key).catch(() => {});
        if (isMountedRef.current) setSavedStatus('saved');
      }
    }, AUTOSAVE_DELAY_MS);
  }, [user?.email]);

  const handleTitleChange = useCallback((v: string) => { setTitle(v); scheduleSave(v, subtitle, body); }, [subtitle, body, scheduleSave]);
  const handleSubtitleChange = useCallback((v: string) => { setSubtitle(v); scheduleSave(title, v, body); }, [title, body, scheduleSave]);
  const handleBodyChange = useCallback((v: string) => { setBody(v); scheduleSave(title, subtitle, v); }, [title, subtitle, scheduleSave]);

  const handleCancel = useCallback(() => { Haptics.selectionAsync(); router.back(); }, [router]);

  const handleNext = useCallback(() => {
    if (!title.trim() && !body.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowPublish(true);
  }, [title, body]);

  const hasContent = title.trim().length > 0 || body.trim().length > 0;

  const savedDotColor = savedStatus === 'saved' ? COLORS.success
    : savedStatus === 'saving' ? COLORS.warning : COLORS.error;
  const savedLabel = savedStatus === 'saved' ? 'Saved' : savedStatus === 'saving' ? 'Saving…' : 'Unsaved';

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <SafeAreaView style={styles.root}>
        <Animated.View style={{ flex: 1 }} entering={(() => { const anim = articleHasSlid ? undefined : SlideInUp.duration(350); articleHasSlid = true; return anim; })()}>
        <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleCancel}
              activeOpacity={0.7}
              hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
              accessibilityLabel="Cancel article"
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <View style={styles.savedPill}>
              <View style={[styles.savedDot, { backgroundColor: savedDotColor }]} />
              <Text style={styles.savedText}>{savedLabel}</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={() => Haptics.selectionAsync()}
                activeOpacity={0.7}
                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                accessibilityLabel="More options"
                style={styles.moreBtn}
              >
                <MoreHorizontal size={iconSize(16)} color={COLORS.textBase} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleNext}
                activeOpacity={0.8}
                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                accessibilityLabel="Next step"
                style={[styles.nextBtn, !hasContent && styles.nextBtnDisabled]}
                disabled={!hasContent}
              >
                <Text style={styles.nextText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Document canvas */}
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.authorRow}>
              <Avatar uri={avatarUri} userId={user?._id} seed={user?.email} name={displayName} className="size-8" />
              <Text style={styles.authorLabel}>{displayName}'s Memo.</Text>
            </View>

            <TextInput ref={titleRef} value={title} onChangeText={handleTitleChange}
              placeholder="Title" placeholderTextColor={COLORS.textDisabled} style={styles.titleInput}
              returnKeyType="next" onSubmitEditing={() => subtitleRef.current?.focus()} blurOnSubmit={false} scrollEnabled={false} multiline />

            <TextInput ref={bodyRef} value={body} onChangeText={handleBodyChange}
              placeholder="Start writing your article…" placeholderTextColor={COLORS.textDisabled} style={styles.bodyInput}
              multiline blurOnSubmit={false} scrollEnabled={false} textAlignVertical="top" />
          </ScrollView>

          {/* Toolbar */}
          <EditorActionBar
            mode="story"
            onSwitchMode={() => { router.replace('/create'); }}
          />
        </KeyboardAvoidingView>
        </Animated.View>
      </SafeAreaView>

      {/* Publish modal — local so it renders above this fullScreenModal */}
      <PublishModal
        visible={showPublish}
        title={title}
        subtitle={subtitle}
        body={body}
        onClose={() => setShowPublish(false)}
      />
    </SafeAreaProvider>
  );
}

// ─── Article styles ────────────────────────────────────────────────────────────

const stylesBase = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  kav: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  cancelBtn: { height: 34, paddingHorizontal: 16, borderRadius: 999, backgroundColor: COLORS.fillWeak, alignItems: 'center', justifyContent: 'center' },
  cancelText: { ...TYPE.label, color: COLORS.textBase },
  savedPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: COLORS.fillWeaker },
  savedDot: { width: 6, height: 6, borderRadius: 3 },
  savedText: { ...TYPE.metadata, color: COLORS.textMuted },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  moreBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.fillWeak, alignItems: 'center', justifyContent: 'center' },
  nextBtn: { height: 34, paddingHorizontal: 18, borderRadius: 999, backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center' },
  nextBtnDisabled: { opacity: 0.4 },
  nextText: { ...TYPE.label, color: COLORS.textInverse },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 4 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  avatar: { width: 24, height: 24, borderRadius: 12 },
  avatarFallback: { backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { ...TYPE.eyebrow, color: COLORS.textInverse },
  authorLabel: { ...TYPE.bodySmall, color: COLORS.textMuted },
  titleInput: { ...TYPE.displayTitle,  color: COLORS.textStrong, padding: 0, margin: 0, marginBottom: 8, lineHeight: 42, textAlignVertical: 'top' },
  subtitleInput: { ...TYPE.cardTitle, color: COLORS.textWeak, padding: 0, margin: 0, marginBottom: 24, lineHeight: 26, textAlignVertical: 'top' },
  bodyInput: { ...TYPE.input, color: COLORS.textBase, padding: 0, margin: 0, lineHeight: 26, minHeight: 300, textAlignVertical: 'top' },
  toolbar: { flexDirection: 'column', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: COLORS.strokeWeaker, backgroundColor: COLORS.background, gap: 10 },
  toolbarLabel: { ...TYPE.eyebrow, color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  toolbarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  storyModePill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 16, borderRadius: 999, backgroundColor: COLORS.textStrong },
  storyModeText: { ...TYPE.label, color: COLORS.textInverse },
  mediaBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.fillWeak, alignItems: 'center', justifyContent: 'center' },
  // legacy — kept so old refs don't crash
  addBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center' },
  toolbarSpacer: { flex: 1 },
  toolbarIcon: { padding: 6, marginLeft: 4 },
});

// ─── Publish modal styles ─────────────────────────────────────────────────────

const pStylesBase = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  container: { paddingHorizontal: 16, paddingTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerTitle: { ...TYPE.sectionTitle, color: COLORS.textStrong },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.fillWeak, alignItems: 'center', justifyContent: 'center' },
  visibilityCard: { backgroundColor: COLORS.fillWeak, borderRadius: 16, padding: 16, marginBottom: 24 },
  visibilityTitle: { ...TYPE.body, color: COLORS.textStrong, marginBottom: 4 },
  visibilitySubtitle: { ...TYPE.bodySmall, color: COLORS.textBase, marginBottom: 14 },
  visibilitySelector: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1, borderColor: COLORS.strokeWeaker },
  visibilitySelectorText: { flex: 1, ...TYPE.label, color: COLORS.textStrong },
  tagsSection: { marginBottom: 32 },
  tagsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  tagsTitle: { ...TYPE.body, color: COLORS.textStrong },
  autotagBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: `${COLORS.info}40`, backgroundColor: `${COLORS.info}08` },
  autotagText: { ...TYPE.metadata, color: COLORS.info },
  tagInput: { backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.strokeWeaker, paddingHorizontal: 14, paddingVertical: 14, ...TYPE.label, color: COLORS.textStrong, minHeight: 50 },
  postBtn: { height: 56, borderRadius: 999, backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center' },
  postBtnDisabled: { opacity: 0.45 },
  postBtnText: { ...TYPE.button, color: COLORS.textInverse },
});

// ─── Success screen styles ────────────────────────────────────────────────────
