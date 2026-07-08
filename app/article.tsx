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
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Image,
  ImageBackground,
  Keyboard,
  Modal,
  ActivityIndicator,
  Share,
  Linking,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider, initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import {
  MoreHorizontal,
  Plus,
  X,
  Users,
  ChevronDown,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react-native';
import { EditorActionBar } from '@/components/ui/EditorActionBar';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, SlideInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

// Tracks whether this screen has already performed its first slide-up entrance.
// Module-level: persists across router.replace calls in the same session,
// resets on app restart — exactly the right scope.
let articleHasSlid = false;
import { COLORS, FONTS } from '@/constants/tokens';
import { useUserStore } from '@/store';
import { useCreateMemory } from '@/hooks/mutations/use-memory-mutations';
import { useBeneficiaries } from '@/hooks/queries/use-beneficiaries';
import { useToast } from '@/components/ui/Toast';
import client from '@/api/client';
import endpoint from '@/api/endpoint';
import type { IBeneficiary } from '@/types';
import { publishedPostUrl } from '@/lib/env';

// ─── Surfer illustration asset ────────────────────────────────────────────────

const SURFER_WEBP = require('../assets/images/illustrations/surfer.webp');
const SUCCESS_BG = require('../assets/images/backgrounds/published_success_bg.png');

const SUN = require("../assets/images/illustrations/fluent-emoji-flat_ringed-planet.png")
const BIG_CLOUD = require("../assets/images/illustrations/noto-v1_cloud.png")
const SMALL_CLOUD = require("../assets/images/illustrations/noto_cloud.png")

const SOCIAL_LINKEDIN = require('../assets/images/icons/linkedin.png');
const SOCIAL_FACEBOOK = require('../assets/images/icons/facebook.png');
const SOCIAL_INSTAGRAM = require('../assets/images/icons/instagram.png');
const SOCIAL_X = require('../assets/images/icons/x.png');
// ─── Publish success screen ───────────────────────────────────────────────────

function PublishSuccessView({
  publishedUrl,
  onAddAnother,
  onDismiss,
}: {
  publishedUrl: string;
  onAddAnother: () => void;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const insets = useSafeAreaInsets();

  const handleCopy = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(publishedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [publishedUrl]);

  const openSocial = useCallback((platform: 'linkedin' | 'facebook' | 'instagram' | 'x') => {
    Haptics.selectionAsync();
    const encoded = encodeURIComponent(publishedUrl);
    const urls: Record<string, string> = {
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
      instagram: `https://www.instagram.com/`,
      x: `https://x.com/intent/tweet?url=${encoded}`,
    };
    Linking.openURL(urls[platform]).catch(() => {});
  }, [publishedUrl]);

  const truncatedUrl = publishedUrl.length > 32
    ? publishedUrl.slice(0, 32) + '…'
    : publishedUrl;

  return (
    <ImageBackground
      source={SUCCESS_BG}
      style={sStyles.screenRoot}
      resizeMode="cover"
    >
      <ScrollView
        contentContainerStyle={[sStyles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Surfer hero */}
        <View style={sStyles.heroArea}>
          {/* <Image source={SUCCESS_BG} style={sStyles.heroBg} resizeMode="cover" /> */}
          <Image
            source={SUN}
            style={sStyles.sunImage}
            resizeMode="contain"
          />
          <Image
            source={BIG_CLOUD}
            style={sStyles.bigCloudImage}
            resizeMode="contain"
          />
           <Image
            source={SMALL_CLOUD}
            style={sStyles.smallCloudImage}
            resizeMode="contain"
          />
          <Image
            source={SURFER_WEBP}
            style={sStyles.surferImage}
            resizeMode="contain"
          />
        </View>

      {/* Content */}
      <Animated.View entering={FadeInDown.duration(400).delay(100)} style={sStyles.content}>
        <Text style={sStyles.title}>Story published{'\n'}successfully</Text>

        {/* Share card */}
        <View style={sStyles.shareCard}>
          <Text style={sStyles.shareLabel}>Share this story with friends</Text>

          {/* URL row */}
          <View style={sStyles.urlRow}>
            <Text style={sStyles.urlText} numberOfLines={1}>{truncatedUrl}</Text>
            <TouchableOpacity
              onPress={handleCopy}
              activeOpacity={0.8}
              style={sStyles.copyBtn}
            >
              {copied
                ? <Check size={15} color={COLORS.success} strokeWidth={2.5} />
                : <Copy size={15} color={COLORS.info} strokeWidth={2} />
              }
              <Text style={[sStyles.copyText, copied && { color: COLORS.success }]}>
                {copied ? 'Copied!' : 'Copy'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={sStyles.dividerRow}>
            <View style={sStyles.dividerLine} />
            <Text style={sStyles.dividerText}>Or share on social media</Text>
            <View style={sStyles.dividerLine} />
          </View>

          {/* Social icons */}
          <View style={sStyles.socialRow}>
            {([
              { id: 'linkedin', icon: SOCIAL_LINKEDIN },
              { id: 'facebook', icon: SOCIAL_FACEBOOK },
              { id: 'instagram', icon: SOCIAL_INSTAGRAM },
              { id: 'x', icon: SOCIAL_X },
            ] as const).map(({ id, icon }) => (
              <TouchableOpacity
                key={id}
                onPress={() => openSocial(id)}
                activeOpacity={0.75}
                style={sStyles.socialBtn}
              >
                <Image source={icon} style={sStyles.socialBtnIcon} resizeMode="contain" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Add another story */}
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onAddAnother(); }}
          activeOpacity={0.85}
          style={sStyles.addAnotherBtn}
        >
          <Plus size={18} color={COLORS.textInverse} strokeWidth={2.5} />
          <Text style={sStyles.addAnotherText}>Add another story</Text>
        </TouchableOpacity>

        {/* Dismiss */}
        <TouchableOpacity onPress={onDismiss} activeOpacity={0.7} style={sStyles.dismissBtn}>
          <Text style={sStyles.dismissText}>Dismiss</Text>
        </TouchableOpacity>
      </Animated.View>
      </ScrollView>
    </ImageBackground>
  );
}

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
  const insets = useSafeAreaInsets();
  const [tags, setTags] = useState('');
  const [selectedBeneficiaryIds, setSelectedBeneficiaryIds] = useState<string[]>([]);
  const [beneficiaryMenuOpen, setBeneficiaryMenuOpen] = useState(false);
  const [isAutotagging, setIsAutotagging] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

  const { mutate: createMemory, isPending } = useCreateMemory();
  const { data: beneficiariesRaw } = useBeneficiaries();
  const { toast } = useToast();

  const beneficiaries: IBeneficiary[] = useMemo(() => {
    if (!beneficiariesRaw) return [];
    if (Array.isArray(beneficiariesRaw)) return beneficiariesRaw;
    if ((beneficiariesRaw as any)?.docs) return (beneficiariesRaw as any).docs;
    return [];
  }, [beneficiariesRaw]);

  const visibilityLabel = useMemo(() => {
    if (!selectedBeneficiaryIds.length) return 'Everyone';
    const names = beneficiaries
      .filter((b) => b._id && selectedBeneficiaryIds.includes(b._id))
      .map((b) => b.name).filter(Boolean);
    return names.length === 1 ? names[0] : `${names.length} beneficiaries`;
  }, [selectedBeneficiaryIds, beneficiaries]);

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
    const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
    createMemory(
      {
        title: title || 'Untitled',
        body: [subtitle, body].filter(Boolean).join('\n\n').trim(),
        tags: tagList,
        status: 'save',
        beneficiaries: selectedBeneficiaryIds.length ? selectedBeneficiaryIds : undefined,
      },
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
  }, [title, subtitle, body, tags, selectedBeneficiaryIds, createMemory, toast, onClose]);

  const toggleBeneficiary = useCallback((id: string) => {
    Haptics.selectionAsync();
    setSelectedBeneficiaryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  // Reset form state when modal closes
  const handleClose = useCallback(() => {
    setPublishedUrl(null);
    setTags('');
    setSelectedBeneficiaryIds([]);
    setBeneficiaryMenuOpen(false);
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <SafeAreaProvider>
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
            contentContainerStyle={[pStyles.container, { paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={pStyles.header}>
              <Text style={pStyles.headerTitle}>Publish post</Text>
              <TouchableOpacity onPress={handleClose} style={pStyles.closeBtn}>
                <X size={16} color={COLORS.textBase} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Visibility card */}
            <View style={pStyles.visibilityCard}>
              <Text style={pStyles.visibilityTitle}>Who can see this story?</Text>
              <Text style={pStyles.visibilitySubtitle}>Stories are visible to all beneficiaries by default.</Text>
              <TouchableOpacity
                onPress={() => { Haptics.selectionAsync(); setBeneficiaryMenuOpen((o) => !o); }}
                style={pStyles.visibilitySelector}
                activeOpacity={0.8}
              >
                <Users size={18} color={COLORS.textBase} strokeWidth={1.8} />
                <Text style={pStyles.visibilitySelectorText}>{visibilityLabel}</Text>
                <ChevronDown size={16} color={COLORS.textMuted} strokeWidth={2} />
              </TouchableOpacity>
              {beneficiaryMenuOpen && (
                <View style={pStyles.beneficiaryMenu}>
                  <TouchableOpacity
                    onPress={() => { setSelectedBeneficiaryIds([]); setBeneficiaryMenuOpen(false); Haptics.selectionAsync(); }}
                    style={[pStyles.beneficiaryOption, !selectedBeneficiaryIds.length && pStyles.beneficiaryOptionActive]}
                  >
                    <Text style={[pStyles.beneficiaryOptionText, !selectedBeneficiaryIds.length && pStyles.beneficiaryOptionTextActive]}>Everyone</Text>
                  </TouchableOpacity>
                  {beneficiaries.map((b) => {
                    if (!b._id) return null;
                    const on = selectedBeneficiaryIds.includes(b._id);
                    return (
                      <TouchableOpacity key={b._id} onPress={() => toggleBeneficiary(b._id!)}
                        style={[pStyles.beneficiaryOption, on && pStyles.beneficiaryOptionActive]}>
                        <Text style={[pStyles.beneficiaryOptionText, on && pStyles.beneficiaryOptionTextActive]}>{b.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Tags */}
            <View style={pStyles.tagsSection}>
              <View style={pStyles.tagsHeader}>
                <Text style={pStyles.tagsTitle}>Add Tags</Text>
                <TouchableOpacity onPress={handleAutotag} activeOpacity={0.8} style={pStyles.autotagBtn} disabled={isAutotagging}>
                  {isAutotagging
                    ? <ActivityIndicator size="small" color={COLORS.info} />
                    : <Sparkles size={13} color={COLORS.info} strokeWidth={2} />
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
      </SafeAreaProvider>
    </Modal>
  );
}

// ─── Main article screen ──────────────────────────────────────────────────────

export default function ArticleScreen() {
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
            <TouchableOpacity onPress={handleCancel} activeOpacity={0.7} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <View style={styles.savedPill}>
              <View style={[styles.savedDot, { backgroundColor: savedDotColor }]} />
              <Text style={styles.savedText}>{savedLabel}</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={() => Haptics.selectionAsync()} activeOpacity={0.7} style={styles.moreBtn}>
                <MoreHorizontal size={16} color={COLORS.textBase} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNext} activeOpacity={0.8}
                style={[styles.nextBtn, !hasContent && styles.nextBtnDisabled]} disabled={!hasContent}>
                <Text style={styles.nextText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Document canvas */}
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.authorRow}>
              {avatarUri
                ? <Image source={{ uri: avatarUri }} style={styles.avatar} />
                : <View style={[styles.avatar, styles.avatarFallback]}><Text style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text></View>
              }
              <Text style={styles.authorLabel}>{displayName}'s Memo.</Text>
            </View>

            <TextInput ref={titleRef} value={title} onChangeText={handleTitleChange}
              placeholder="Title" placeholderTextColor={COLORS.textDisabled} style={styles.titleInput}
              returnKeyType="next" onSubmitEditing={() => subtitleRef.current?.focus()} blurOnSubmit={false} scrollEnabled={false} multiline />

            {/* <TextInput ref={subtitleRef} value={subtitle} onChangeText={handleSubtitleChange}
              placeholder="Add a subtitle…" placeholderTextColor={COLORS.textDisabled} style={styles.subtitleInput}
              returnKeyType="next" onSubmitEditing={() => bodyRef.current?.focus()} blurOnSubmit={false} scrollEnabled={false} multiline /> */}

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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  kav: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  cancelBtn: { height: 34, paddingHorizontal: 16, borderRadius: 999, backgroundColor: COLORS.fillWeak, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontFamily: FONTS.sans, fontSize: 14, color: COLORS.textBase },
  savedPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: COLORS.fillWeaker },
  savedDot: { width: 6, height: 6, borderRadius: 3 },
  savedText: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.textMuted },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  moreBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.fillWeak, alignItems: 'center', justifyContent: 'center' },
  nextBtn: { height: 34, paddingHorizontal: 18, borderRadius: 999, backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center' },
  nextBtnDisabled: { opacity: 0.4 },
  nextText: { fontFamily: FONTS.sansSemi, fontSize: 14, color: COLORS.textInverse },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 22, paddingBottom: 24, paddingTop: 4 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  avatar: { width: 24, height: 24, borderRadius: 12 },
  avatarFallback: { backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontFamily: FONTS.sansBold, fontSize: 10, color: COLORS.textInverse },
  authorLabel: { fontFamily: FONTS.sans, fontSize: 13, color: COLORS.textMuted },
  titleInput: { fontFamily: FONTS.serif, fontSize: 34, fontWeight: '700', color: COLORS.textStrong, padding: 0, margin: 0, marginBottom: 8, lineHeight: 42, textAlignVertical: 'top' },
  subtitleInput: { fontFamily: FONTS.sans, fontSize: 18, color: COLORS.textWeak, padding: 0, margin: 0, marginBottom: 24, lineHeight: 26, textAlignVertical: 'top' },
  bodyInput: { fontFamily: FONTS.sans, fontSize: 16, color: COLORS.textBase, padding: 0, margin: 0, lineHeight: 26, minHeight: 300, textAlignVertical: 'top' },
  toolbar: { flexDirection: 'column', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: COLORS.strokeWeaker, backgroundColor: COLORS.background, gap: 10 },
  toolbarLabel: { fontFamily: FONTS.sansBold, fontSize: 10, color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  toolbarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  storyModePill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 16, borderRadius: 999, backgroundColor: COLORS.textStrong },
  storyModeText: { fontFamily: FONTS.sansSemi, fontSize: 14, color: COLORS.textInverse },
  mediaBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.fillWeak, alignItems: 'center', justifyContent: 'center' },
  // legacy — kept so old refs don't crash
  addBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center' },
  toolbarSpacer: { flex: 1 },
  toolbarIcon: { padding: 6, marginLeft: 4 },
});

// ─── Publish modal styles ─────────────────────────────────────────────────────

const pStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  container: { paddingHorizontal: 20, paddingTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerTitle: { fontFamily: FONTS.serif, fontSize: 22, color: COLORS.textStrong },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.fillWeak, alignItems: 'center', justifyContent: 'center' },
  visibilityCard: { backgroundColor: COLORS.fillWeak, borderRadius: 16, padding: 16, marginBottom: 24 },
  visibilityTitle: { fontFamily: FONTS.sansBold, fontSize: 15, color: COLORS.textStrong, marginBottom: 4 },
  visibilitySubtitle: { fontFamily: FONTS.sans, fontSize: 13, color: COLORS.textBase, marginBottom: 14 },
  visibilitySelector: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1, borderColor: COLORS.strokeWeaker },
  visibilitySelectorText: { flex: 1, fontFamily: FONTS.sansMedium, fontSize: 14, color: COLORS.textStrong },
  beneficiaryMenu: { marginTop: 8, backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.strokeWeaker, paddingVertical: 4 },
  beneficiaryOption: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, marginHorizontal: 4 },
  beneficiaryOptionActive: { backgroundColor: `${COLORS.brand}12` },
  beneficiaryOptionText: { fontFamily: FONTS.sans, fontSize: 14, color: COLORS.textStrong },
  beneficiaryOptionTextActive: { color: COLORS.brand, fontFamily: FONTS.sansMedium },
  tagsSection: { marginBottom: 32 },
  tagsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  tagsTitle: { fontFamily: FONTS.sansBold, fontSize: 15, color: COLORS.textStrong },
  autotagBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: `${COLORS.info}40`, backgroundColor: `${COLORS.info}08` },
  autotagText: { fontFamily: FONTS.sansMedium, fontSize: 12, color: COLORS.info },
  tagInput: { backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.strokeWeaker, paddingHorizontal: 14, paddingVertical: 14, fontFamily: FONTS.sans, fontSize: 14, color: COLORS.textStrong, minHeight: 50 },
  postBtn: { height: 56, borderRadius: 999, backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center' },
  postBtnDisabled: { opacity: 0.45 },
  postBtnText: { fontFamily: FONTS.sansSemi, fontSize: 16, color: COLORS.textInverse },
});

// ─── Success screen styles ────────────────────────────────────────────────────

const sStyles = StyleSheet.create({
  // Outermost View (takes full modal space)
  screenRoot: {
    flex: 1,
  },

  // ScrollView contentContainer
  root: {
    flexGrow: 1,
  },

  // Surfer hero — fixed-height positioning context
  heroArea: {
    height: 300,
    width: '100%',
    position: 'relative',
  },
  // Surfer: centered horizontally, anchored to bottom
  surferImage: {
    position: 'absolute',
    width: 280,
    height: 280,
    alignSelf: 'center',
    bottom: 0,
  },
  // Saturn planet: upper-left
  sunImage: {
    position: 'absolute',
    width: 62,
    height: 62,
    left: 95,
    top: 95,
  },
  // Large cloud: upper-right, slightly off-screen edge
  bigCloudImage: {
    position: 'absolute',
    width: 100,
    height: 80,
    right: "50%",
    marginRight: -150,
    top: 50,
  },
  // Small cloud: upper-center-right
  smallCloudImage: {
    position: 'absolute',
    width: 52,
    height: 42,
    left: '50%',
    // marginLeft: -8,
    top: 50,
  },

  // Content below hero
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
    alignItems: 'center',
    gap: 24,
  },

  title: {
    fontFamily: FONTS.sansBold,
    fontSize: 26,
    color: COLORS.textStrong,
    textAlign: 'center',
    lineHeight: 34,
  },

  // Share card
  shareCard: {
    width: '100%',
    backgroundColor: COLORS.fillWeak,
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  shareLabel: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    color: COLORS.textBase,
  },

  // URL row
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
    overflow: 'hidden',
  },
  urlText: {
    flex: 1,
    fontFamily: FONTS.sans,
    fontSize: 13,
    color: COLORS.textWeak,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.strokeWeaker,
    backgroundColor: COLORS.card,
  },
  copyText: {
    fontFamily: FONTS.sansSemi,
    fontSize: 13,
    color: COLORS.info,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.strokeWeaker,
  },
  dividerText: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: COLORS.textMuted,
  },

  // Social icons
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  socialBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIcon: {
    fontSize: 18,
    fontFamily: FONTS.sansBold,
  },
  socialBtnIcon: {
    width: 28,
    height: 28,
  },

  // Add another story button
  addAnotherBtn: {
    width: '100%',
    height: 56,
    borderRadius: 999,
    backgroundColor: COLORS.textStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addAnotherText: {
    fontFamily: FONTS.sansBold,
    fontSize: 16,
    color: COLORS.textInverse,
  },

  // Dismiss
  dismissBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  dismissText: {
    fontFamily: FONTS.sans,
    fontSize: 15,
    color: COLORS.textBase,
    textAlign: 'center',
  },
});
