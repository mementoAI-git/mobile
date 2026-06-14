/**
 * EditorActionBar — bottom toolbar for the story editor and quick-capture screens.
 *
 * STORY MODE (new layout matching the reference design):
 *   [ ⊕ upload ]  [ H1 · H2 · B · I · U · S · List · Quote … ] ← scrollable
 *
 *   • The ⊕ button expands a mini upload-menu above the bar (Gallery, Camera, Mic, File).
 *   • All text-formatting tools are the primary content of the bar.
 *   • The separate FormattingToolbar row in editor.tsx is no longer rendered —
 *     everything is merged into this single bar.
 *
 * QUICK-CAPTURE MODE (unchanged):
 *   Mode pill | media icon buttons
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BookOpen,
  PlusCircle,
  Image as ImageIcon,
  ImagePlus,
  AudioLines,
  Music,
  Heading1,
  Heading2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS } from '@/constants/tokens';
import type { EditorBridge } from '@10play/tentap-editor';
import { useBridgeState } from '@10play/tentap-editor';

// ─── Constants ────────────────────────────────────────────────────────────────

const TOOLTIP_SEEN_KEY = 'editor_mode_tooltip_seen_v1';
const TOOLTIP_DURATION_MS = 3500;

// ─── Types ────────────────────────────────────────────────────────────────────

export type EditorMode = 'story' | 'quick-capture';

interface EditorActionBarProps {
  mode: EditorMode;
  onSwitchMode: () => void;
  disableModeSwitch?: boolean;
  onPhoto?: () => void;
  onCamera?: () => void;
  onAudio?: () => void;
  onFile?: () => void;
  isRecording?: boolean;
  /** Tiptap bridge — required for story mode formatting buttons */
  editor?: EditorBridge | null;
}

// ─── Small formatting button ──────────────────────────────────────────────────

function FmtBtn({
  active,
  onPress,
  children,
}: {
  active?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
      activeOpacity={0.7}
      style={[fmtStyles.btn, active && fmtStyles.btnActive]}
    >
      {children}
    </TouchableOpacity>
  );
}

const fmtStyles = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnActive: {
    backgroundColor: `${COLORS.brand}18`,
  },
});

// ─── Story-mode toolbar ───────────────────────────────────────────────────────

// Inner component that always has a real bridge — avoids conditional hook call
function StoryFormattingTools({ editor }: { editor: EditorBridge }) {
  const s = useBridgeState(editor);
  const activeColor = COLORS.brand;
  const inactiveColor = COLORS.textBase;
  const sz = 18;
  return (
    <>
      <FmtBtn active={s.headingLevel === 1} onPress={() => editor.toggleHeading(1)}>
        <Heading1 size={sz} color={s.headingLevel === 1 ? activeColor : inactiveColor} strokeWidth={2} />
      </FmtBtn>
      <FmtBtn active={s.headingLevel === 2} onPress={() => editor.toggleHeading(2)}>
        <Heading2 size={sz} color={s.headingLevel === 2 ? activeColor : inactiveColor} strokeWidth={2} />
      </FmtBtn>
      <View style={styles.fmtDivider} />
      <FmtBtn active={s.isBoldActive} onPress={() => editor.toggleBold()}>
        <Bold size={sz} color={s.isBoldActive ? activeColor : inactiveColor} strokeWidth={s.isBoldActive ? 2.5 : 2} />
      </FmtBtn>
      <FmtBtn active={s.isItalicActive} onPress={() => editor.toggleItalic()}>
        <Italic size={sz} color={s.isItalicActive ? activeColor : inactiveColor} strokeWidth={2} />
      </FmtBtn>
      <FmtBtn active={s.isUnderlineActive} onPress={() => editor.toggleUnderline()}>
        <UnderlineIcon size={sz} color={s.isUnderlineActive ? activeColor : inactiveColor} strokeWidth={2} />
      </FmtBtn>
      <FmtBtn active={s.isStrikeActive} onPress={() => editor.toggleStrike()}>
        <Strikethrough size={sz} color={s.isStrikeActive ? activeColor : inactiveColor} strokeWidth={2} />
      </FmtBtn>
      <View style={styles.fmtDivider} />
      <FmtBtn active={s.isBulletListActive} onPress={() => editor.toggleBulletList()}>
        <List size={sz} color={s.isBulletListActive ? activeColor : inactiveColor} strokeWidth={2} />
      </FmtBtn>
      <FmtBtn active={s.isOrderedListActive} onPress={() => editor.toggleOrderedList()}>
        <ListOrdered size={sz} color={s.isOrderedListActive ? activeColor : inactiveColor} strokeWidth={2} />
      </FmtBtn>
      <FmtBtn active={s.isBlockquoteActive} onPress={() => editor.toggleBlockquote()}>
        <Quote size={sz} color={s.isBlockquoteActive ? activeColor : inactiveColor} strokeWidth={2} />
      </FmtBtn>
    </>
  );
}

/** Pure formatting row — receives upload state from parent so it stays outside ScrollView */
function StoryToolbar({
  editor,
  uploadOpen,
  onToggleUpload,
}: {
  editor?: EditorBridge | null;
  uploadOpen: boolean;
  onToggleUpload: () => void;
}) {
  return (
    <View style={styles.storyRow}>
      {/* ⊕ Upload toggle */}
      <TouchableOpacity
        onPress={onToggleUpload}
        activeOpacity={0.75}
        style={[styles.uploadBtn, uploadOpen && styles.uploadBtnActive]}
      >
        <PlusCircle
          size={22}
          color={uploadOpen ? COLORS.brand : COLORS.textBase}
          strokeWidth={2}
        />
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.vertDivider} />

      {/* Formatting icons — scrollable */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.fmtScroll}
        keyboardShouldPersistTaps="always"
      >
        {editor ? (
          <StoryFormattingTools editor={editor} />
        ) : (
          [Heading1, Heading2, Bold, Italic, UnderlineIcon, Strikethrough, List, ListOrdered, Quote].map((Icon, i) => (
            <View key={i} style={[fmtStyles.btn, { opacity: 0.3 }]}>
              <Icon size={18} color={COLORS.textMuted} strokeWidth={2} />
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EditorActionBar({
  mode,
  onSwitchMode,
  disableModeSwitch = false,
  onPhoto,
  onCamera,
  onAudio,
  onFile,
  isRecording = false,
  editor,
}: EditorActionBarProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipOpacity = useRef(new Animated.Value(0)).current;
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (mode === 'story') return; // no tooltip in story mode
    AsyncStorage.getItem(TOOLTIP_SEEN_KEY).then((val) => {
      if (!val) {
        const t = setTimeout(() => {
          setShowTooltip(true);
          Animated.timing(tooltipOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
          tooltipTimer.current = setTimeout(dismissTooltip, TOOLTIP_DURATION_MS);
        }, 800);
        return () => clearTimeout(t);
      }
    });
    return () => { if (tooltipTimer.current) clearTimeout(tooltipTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissTooltip = useCallback(() => {
    Animated.timing(tooltipOpacity, { toValue: 0, duration: 200, useNativeDriver: true })
      .start(() => setShowTooltip(false));
    AsyncStorage.setItem(TOOLTIP_SEEN_KEY, '1').catch(() => {});
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
  }, [tooltipOpacity]);

  const handleSwitchMode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (showTooltip) dismissTooltip();
    onSwitchMode();
  }, [onSwitchMode, showTooltip, dismissTooltip]);

  const insets = useSafeAreaInsets();
  const isStory = mode === 'story';

  // ── Story mode: new unified toolbar ────────────────────────────────────────
  // The upload menu is rendered in a plain View ABOVE the ScrollView so it isn't
  // clipped by the ScrollView's overflow. The ScrollView itself provides the
  // keyboard-anchor (keyboardShouldPersistTaps="always") needed for the WebView.
  const [uploadOpen, setUploadOpen] = useState(false);

  const toggleUpload = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setUploadOpen(o => !o);
  }, []);

  const callAndClose = useCallback((fn?: () => void) => {
    setUploadOpen(false);
    fn?.();
  }, []);

  if (isStory) {
    return (
      <View style={{ flexShrink: 0, flexGrow: 0 }}>
        {/* Transparent backdrop — closes the menu when tapped */}
        {uploadOpen && (
          <Pressable
            onPress={() => setUploadOpen(false)}
            style={StyleSheet.absoluteFillObject}
          />
        )}

        {/* Upload mini-menu — rendered OUTSIDE the ScrollView so it isn't clipped */}
        {uploadOpen && (
          <View style={[styles.uploadMenu, { marginLeft: 12 }]}>
            <TouchableOpacity onPress={() => { Haptics.selectionAsync(); callAndClose(onPhoto); }} activeOpacity={0.8} style={styles.uploadItem}>
              <ImageIcon size={18} color={COLORS.textStrong} strokeWidth={1.8} />
              <Text style={styles.uploadLabel}>Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { Haptics.selectionAsync(); callAndClose(onCamera); }} activeOpacity={0.8} style={styles.uploadItem}>
              <ImagePlus size={18} color={COLORS.textStrong} strokeWidth={1.8} />
              <Text style={styles.uploadLabel}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { Haptics.selectionAsync(); callAndClose(onAudio); }} activeOpacity={0.8} style={[styles.uploadItem, isRecording && { backgroundColor: `${COLORS.error}15` }]}>
              <AudioLines size={18} color={isRecording ? COLORS.error : COLORS.textStrong} strokeWidth={1.8} />
              <Text style={[styles.uploadLabel, isRecording && { color: COLORS.error }]}>{isRecording ? 'Recording…' : 'Voice'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { Haptics.selectionAsync(); callAndClose(onFile); }} activeOpacity={0.8} style={styles.uploadItem}>
              <Music size={18} color={COLORS.textStrong} strokeWidth={1.8} />
              <Text style={styles.uploadLabel}>File</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Keyboard anchor + toolbar row */}
        <ScrollView
          scrollEnabled={false}
          keyboardShouldPersistTaps="always"
          style={[styles.container, { paddingBottom: Math.max(12, insets.bottom) }]}
        >
          <StoryToolbar
            editor={editor}
            uploadOpen={uploadOpen}
            onToggleUpload={toggleUpload}
          />
        </ScrollView>
      </View>
    );
  }

  // ── Quick-capture mode: original layout ─────────────────────────────────────
  return (
    <View style={[styles.container, { paddingBottom: Math.max(12, insets.bottom) }]}>
      <Text style={styles.label}>SWITCH MODES OR ADD MEDIA FILES</Text>

      {showTooltip && (
        <Animated.View style={[styles.tooltip, { opacity: tooltipOpacity }]}>
          <TouchableOpacity activeOpacity={0.9} onPress={dismissTooltip}>
            <Text style={styles.tooltipText}>
              Switch between{' '}
              <Text style={styles.tooltipBold}>Story mode</Text>
              {' '}(long-form writing) and{' '}
              <Text style={styles.tooltipBold}>Quick Capture</Text>
              {' '}(fast notes & media)
            </Text>
            <Text style={styles.tooltipDismiss}>Tap to dismiss</Text>
          </TouchableOpacity>
          <View style={styles.tooltipArrow} />
        </Animated.View>
      )}

      <View style={styles.row}>
        {!disableModeSwitch && (
          <TouchableOpacity
            onPress={handleSwitchMode}
            activeOpacity={0.8}
            style={[styles.modePill, styles.modePillQuick]}
          >
            <BookOpen size={15} color={COLORS.textInverse} strokeWidth={2} />
            <Text style={styles.modePillText}>Quick capture</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); onPhoto?.(); }} activeOpacity={0.75} style={styles.mediaBtn}>
          <ImageIcon size={20} color={COLORS.textBase} strokeWidth={1.8} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); onCamera?.(); }} activeOpacity={0.75} style={styles.mediaBtn}>
          <ImagePlus size={20} color={COLORS.textBase} strokeWidth={1.8} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); onAudio?.(); }} activeOpacity={0.75} style={[styles.mediaBtn, isRecording && styles.mediaBtnRecording]}>
          <AudioLines size={20} color={isRecording ? COLORS.error : COLORS.textBase} strokeWidth={1.8} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); onFile?.(); }} activeOpacity={0.75} style={styles.mediaBtn}>
          <Music size={20} color={COLORS.textBase} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.strokeWeaker,
    backgroundColor: COLORS.background,
  },

  // ── Story toolbar ───────────────────────────────────────────────────────────
  storyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    gap: 4,
  },
  uploadBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  uploadBtnActive: {
    backgroundColor: `${COLORS.brand}15`,
  },
  vertDivider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.strokeWeaker,
    marginHorizontal: 4,
    flexShrink: 0,
  },
  fmtScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingRight: 8,
  },
  fmtDivider: {
    width: 1,
    height: 18,
    backgroundColor: COLORS.strokeWeaker,
    marginHorizontal: 4,
  },

  // Upload mini-menu
  uploadMenu: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 4,
    marginBottom: 8,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 200,
  },
  uploadItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: COLORS.fillWeak,
    minWidth: 64,
  },
  uploadLabel: {
    fontFamily: FONTS.sansMedium,
    fontSize: 11,
    color: COLORS.textStrong,
  },

  // ── Quick-capture toolbar ───────────────────────────────────────────────────
  label: {
    fontFamily: FONTS.sansBold,
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  modePillQuick: {
    backgroundColor: '#77C7AF',
  },
  modePillText: {
    fontFamily: FONTS.sansBold,
    fontSize: 13,
    color: COLORS.textInverse,
  },
  mediaBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.fillWeak,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaBtnRecording: {
    backgroundColor: `${COLORS.error}15`,
  },

  // ── Tooltip ─────────────────────────────────────────────────────────────────
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    left: 12,
    right: 12,
    marginBottom: 12,
    backgroundColor: COLORS.textStrong,
    borderRadius: 14,
    padding: 14,
    zIndex: 100,
  },
  tooltipText: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    color: COLORS.textInverse,
    lineHeight: 20,
  },
  tooltipBold: {
    fontFamily: FONTS.sansBold,
    color: COLORS.textInverse,
  },
  tooltipDismiss: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 6,
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -6,
    left: 20,
    width: 12,
    height: 12,
    backgroundColor: COLORS.textStrong,
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
  },
});
