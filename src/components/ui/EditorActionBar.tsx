import { useResolvedAppearance, useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';
import { BlurView } from 'expo-blur';
/**
 * EditorActionBar — bottom toolbar for the story editor and quick-capture screens.
 *
 * STORY MODE (new layout matching the reference design):
 *   [ ⊕ upload ]  [ mic · B · I · U · S · Lists · Quote … ] ← scrollable
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
  ScrollView,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { Pressable, TouchableOpacity } from '@/components/ui/Touchable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BookOpen from 'lucide-react-native/icons/book-open';
import Pencil from 'lucide-react-native/icons/pencil';
import Plus from 'lucide-react-native/icons/plus';
import ImageIcon from 'lucide-react-native/icons/image';
import Camera from 'lucide-react-native/icons/camera';
import AudioLines from 'lucide-react-native/icons/audio-lines';
import Paperclip from 'lucide-react-native/icons/paperclip';
import Bold from 'lucide-react-native/icons/bold';
import Italic from 'lucide-react-native/icons/italic';
import UnderlineIcon from 'lucide-react-native/icons/underline';
import Strikethrough from 'lucide-react-native/icons/strikethrough';
import List from 'lucide-react-native/icons/list';
import ListOrdered from 'lucide-react-native/icons/list-ordered';
import Quote from 'lucide-react-native/icons/quote';
import * as Haptics from 'expo-haptics';
import type { ThemeColors } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { iconSize, radius, minTouchTarget } from '@/constants/responsive';
import { MediaPickerMenu } from './MediaPickerMenu';
import { HAS_NATIVE_MEDIA_MENU, NativeMediaMenu } from './NativeMediaMenu';
import { RecordingIconButton } from './RecordingIconButton';
import type { EditorBridge } from '@10play/tentap-editor';
import { useBridgeState } from '@10play/tentap-editor';

// ─── Constants ────────────────────────────────────────────────────────────────

const TOOLTIP_SEEN_KEY = 'editor_mode_tooltip_seen_v1';
const TOOLTIP_DURATION_MS = 3500;
/** Every screen using this bar sits in a SafeAreaView that already clears the home indicator. */
const BAR_BOTTOM_PADDING = 4;
/** Story toolbar buttons; hitSlop keeps their tap area at 44pt. */
const BAR_BUTTON = 36;

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
  audioDisabled?: boolean;
  /** Tiptap bridge — required for story mode formatting buttons */
  editor?: EditorBridge | null;
}

// ─── Small formatting button ──────────────────────────────────────────────────

function FmtBtn({
  active,
  onPress,
  label,
  children,
}: {
  active?: boolean;
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const fmtStyles = useThemeStyles(createFmtStyles);
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: Boolean(active) }}
      onPressIn={() => { Haptics.selectionAsync(); onPress(); }}
      activeOpacity={0.7}
      hitSlop={4}
      style={[fmtStyles.btn, active && fmtStyles.btnActive]}
    >
      {children}
    </TouchableOpacity>
  );
}

const createFmtStyles = (COLORS: ThemeColors) => StyleSheet.create({
  btn: {
    width: BAR_BUTTON,
    height: BAR_BUTTON,
    borderRadius: BAR_BUTTON / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnActive: {
    backgroundColor: COLORS.fillWeak,
  },
});

// ─── Story-mode toolbar ───────────────────────────────────────────────────────

// Inner component that always has a real bridge — avoids conditional hook call
function StoryFormattingTools({ editor }: { editor: EditorBridge }) {
  const COLORS = useThemeColors();
  const s = useBridgeState(editor);
  const activeColor = COLORS.textStrong;
  const inactiveColor = COLORS.textBase;
  const sz = iconSize(20);
  return (
    <>
      <FmtBtn label="Bold" active={s.isBoldActive} onPress={() => editor.toggleBold()}>
        <Bold size={sz} color={s.isBoldActive ? activeColor : inactiveColor} strokeWidth={s.isBoldActive ? 2.5 : 2} />
      </FmtBtn>
      <FmtBtn label="Italic" active={s.isItalicActive} onPress={() => editor.toggleItalic()}>
        <Italic size={sz} color={s.isItalicActive ? activeColor : inactiveColor} strokeWidth={2} />
      </FmtBtn>
      <FmtBtn label="Underline" active={s.isUnderlineActive} onPress={() => editor.toggleUnderline()}>
        <UnderlineIcon size={sz} color={s.isUnderlineActive ? activeColor : inactiveColor} strokeWidth={2} />
      </FmtBtn>
      <FmtBtn label="Strikethrough" active={s.isStrikeActive} onPress={() => editor.toggleStrike()}>
        <Strikethrough size={sz} color={s.isStrikeActive ? activeColor : inactiveColor} strokeWidth={2} />
      </FmtBtn>
      <FmtBtn label="Bulleted list" active={s.isBulletListActive} onPress={() => editor.toggleBulletList()}>
        <List size={sz} color={s.isBulletListActive ? activeColor : inactiveColor} strokeWidth={2} />
      </FmtBtn>
      <FmtBtn label="Numbered list" active={s.isOrderedListActive} onPress={() => editor.toggleOrderedList()}>
        <ListOrdered size={sz} color={s.isOrderedListActive ? activeColor : inactiveColor} strokeWidth={2} />
      </FmtBtn>
      <FmtBtn label="Quote" active={s.isBlockquoteActive} onPress={() => editor.toggleBlockquote()}>
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
  onSwitchMode,
  disableModeSwitch,
  onAudio,
  audioDisabled,
  isRecording,
  nativeMenu,
}: {
  editor?: EditorBridge | null;
  uploadOpen: boolean;
  onToggleUpload: () => void;
  /** iOS system menu that replaces the upload toggle and the tile popup. */
  nativeMenu?: React.ReactNode;
  onSwitchMode?: () => void;
  disableModeSwitch?: boolean;
  onAudio?: () => void;
  isRecording?: boolean;
  audioDisabled?: boolean;
}) {
  const COLORS = useThemeColors();
  const fmtStyles = useThemeStyles(createFmtStyles);
  const styles = useThemeStyles(createStyles);
  const dark = useResolvedAppearance() === 'dark';
  return (
    <View style={styles.storyRow}>
      {/* Theme-adaptive glass: a blur (iOS) under the weak fill, clipped to the pill. */}
      <View pointerEvents="none" style={styles.storyGlass}>
        {Platform.OS === 'ios' && <BlurView tint={dark ? 'dark' : 'light'} intensity={60} style={StyleSheet.absoluteFill} />}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.fillWeak }]} />
      </View>
      <View style={styles.captureTools}>
      {/* ⊕ Upload toggle: the iOS system menu, or a toggle for the tile popup elsewhere */}
      {nativeMenu ?? (
      <TouchableOpacity
        onPress={onToggleUpload}
        activeOpacity={0.75}
        hitSlop={6}
        accessibilityLabel="Add attachment"
        style={[styles.uploadBtn, styles.addButton]}
      >
        <Plus
          size={iconSize(20)}
          color={COLORS.activeText}
          strokeWidth={2}
        />
      </TouchableOpacity>
      )}

      <RecordingIconButton
        hitSlop={6}
        disabled={audioDisabled}
        neutral
        onPress={onAudio}
        active={isRecording}
        style={styles.uploadBtn}
      />
      </View>

      {/* Divider */}
      <View style={styles.vertDivider} />

      {/* Formatting icons — scrollable, takes remaining space */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.fmtScroll}
        keyboardShouldPersistTaps="always"
        style={{ flex: 1 }}
      >
        {editor ? (
          <StoryFormattingTools editor={editor} />
        ) : (
          [Bold, Italic, UnderlineIcon, Strikethrough, List, ListOrdered, Quote].map((Icon, i) => (
            <View key={i} style={[fmtStyles.btn, { opacity: 0.3 }]}>
              <Icon size={iconSize(20)} color={COLORS.textMuted} strokeWidth={2} />
            </View>
          ))
        )}
      </ScrollView>

      {/* Mode switch pill — right side, mirrors quick-capture bar */}
      {!disableModeSwitch && onSwitchMode && (
        <>
          <View style={styles.vertDivider} />
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSwitchMode(); }}
            activeOpacity={0.8}
            style={[styles.modePill, styles.modePillStory]}
          >
            <BookOpen size={14} color={COLORS.textInverse} strokeWidth={2} />
            <Text style={styles.modePillText}>Story mode</Text>
          </TouchableOpacity>
        </>
      )}
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
  audioDisabled,
  isRecording = false,
  editor,
}: EditorActionBarProps) {
  const COLORS = useThemeColors();
  const styles = useThemeStyles(createStyles);
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
        {/* Shared media picker menu — handles backdrop + tiles (non-iOS) */}
        <MediaPickerMenu
          visible={uploadOpen && !HAS_NATIVE_MEDIA_MENU}
          onClose={() => setUploadOpen(false)}
          onGallery={() => callAndClose(onPhoto)}
          onCamera={() => callAndClose(onCamera)}
          onVoice={() => callAndClose(onAudio)}
          onFile={() => callAndClose(onFile)}
          isRecording={isRecording}
          menuLeft={12}
        />

        {/* Keyboard anchor + toolbar row */}
        <ScrollView
          scrollEnabled={false}
          keyboardShouldPersistTaps="always"
          style={[styles.storyBar, { paddingBottom: BAR_BOTTOM_PADDING }]}
        >
          <StoryToolbar
            editor={editor}
            uploadOpen={uploadOpen}
            onAudio={onAudio}
            audioDisabled={audioDisabled}
            isRecording={isRecording}
            onToggleUpload={toggleUpload}
            nativeMenu={HAS_NATIVE_MEDIA_MENU ? (
              <NativeMediaMenu
                size={BAR_BUTTON}
                onGallery={onPhoto}
                onCamera={onCamera}
                onVoice={onAudio}
                onFile={onFile}
                isRecording={isRecording}
              />
            ) : undefined}
            onSwitchMode={handleSwitchMode}
            disableModeSwitch={disableModeSwitch}
          />
        </ScrollView>
      </View>
    );
  }

  // ── Quick-capture mode: original layout ─────────────────────────────────────
  return (
    <View style={[styles.container, { paddingBottom: BAR_BOTTOM_PADDING }]}>
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
          <Camera size={20} color={COLORS.textBase} strokeWidth={1.8} />
        </TouchableOpacity>
        <RecordingIconButton
          onPress={() => { Haptics.selectionAsync(); onAudio?.(); }}
          active={isRecording}
          style={styles.mediaBtn}
        >
          <AudioLines size={20} color={isRecording ? COLORS.textInverse : COLORS.textBase} strokeWidth={1.8} />
        </RecordingIconButton>
        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); onFile?.(); }} activeOpacity={0.75} style={styles.mediaBtn}>
          <Paperclip size={20} color={COLORS.textBase} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.strokeWeaker,
    backgroundColor: COLORS.background,
  },

  // ── Story toolbar ───────────────────────────────────────────────────────────
  // Floating pill, like the tab bar.
  storyBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  storyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.strokeWeak,
  },
  storyGlass: {
    ...StyleSheet.absoluteFill,
    borderRadius: 999,
    overflow: 'hidden',
  },
  captureTools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  uploadBtn: {
    width: BAR_BUTTON,
    height: BAR_BUTTON,
    borderRadius: BAR_BUTTON / 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  addButton: {
    backgroundColor: COLORS.activeFill,
  },
  vertDivider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.strokeWeaker,
    flexShrink: 0,
  },
  fmtScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    backgroundColor: COLORS.popover,
    borderRadius: radius(16),
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
    borderRadius: radius(12),
    backgroundColor: COLORS.fillWeak,
    minWidth: 64,
  },
  uploadLabel: {
    ...TYPE.metadata,
    color: COLORS.textStrong,
  },

  // ── Quick-capture toolbar ───────────────────────────────────────────────────
  label: {
    ...TYPE.eyebrow,
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
    height: minTouchTarget(44),
    paddingHorizontal: 12,
    borderRadius: radius(8),
  },
  modePillQuick: {
    backgroundColor: COLORS.success,
  },
  modePillStory: {
    backgroundColor: COLORS.mediaSurface,
  },
  modePillText: {
    ...TYPE.buttonSmall,
    color: COLORS.mediaText,
  },
  mediaBtn: {
    width: minTouchTarget(44),
    height: minTouchTarget(44),
    borderRadius: radius(12),
    backgroundColor: COLORS.fillWeak,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Tooltip ─────────────────────────────────────────────────────────────────
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    left: 12,
    right: 12,
    marginBottom: 12,
    backgroundColor: COLORS.mediaSurface,
    borderRadius: 14,
    padding: 14,
    zIndex: 100,
  },
  tooltipText: {
    ...TYPE.bodySmall,
    color: COLORS.mediaText,
    lineHeight: 20,
  },
  tooltipBold: {
    ...TYPE.buttonSmall,
    color: COLORS.mediaText,
  },
  tooltipDismiss: {
    ...TYPE.metadata,
    color: COLORS.mediaTextWeak,
    marginTop: 6,
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -6,
    left: 20,
    width: 12,
    height: 12,
    backgroundColor: COLORS.mediaSurface,
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
  },
});
