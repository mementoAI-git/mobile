import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';
/**
 * StoryRichEditor — Tiptap-powered WYSIWYG body editor for story mode.
 *
 * FormattingToolbar is exported separately so it can be rendered
 * in editor.tsx between the attachment strip and EditorActionBar.
 */

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import type { WebViewMessageEvent } from 'react-native-webview';
import { TouchableOpacity } from '@/components/ui/Touchable';
import {
  RichText,
  useEditorBridge,
  useBridgeState,
  TenTapStartKit,
  BridgeExtension,
  type EditorBridge,
} from '@10play/tentap-editor';
import * as Haptics from 'expo-haptics';
import Bold from 'lucide-react-native/icons/bold';
import Italic from 'lucide-react-native/icons/italic';
import UnderlineIcon from 'lucide-react-native/icons/underline';
import Strikethrough from 'lucide-react-native/icons/strikethrough';
import Heading1 from 'lucide-react-native/icons/heading-1';
import Heading2 from 'lucide-react-native/icons/heading-2';
import List from 'lucide-react-native/icons/list';
import ListOrdered from 'lucide-react-native/icons/list-ordered';
import Quote from 'lucide-react-native/icons/quote';
import type { ThemeColors } from '@/constants/tokens';
import { BEGIN_DICTATION_BOOKMARK, insertDictationScript } from '@/features/editor/dictation-insertion';
import { buildEditorThemeCSS } from '@/features/editor/editor-theme';
// Typography metrics are resolved centrally by buildEditorThemeCSS.
import { minTouchTarget, radius, iconSize } from '@/constants/responsive';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StoryRichEditorRef {
  getHTML: () => Promise<string>;
  beginDictation: () => void;
  insertDictation: (text: string) => Promise<string>;
  focus: () => void;
  setContent: (html: string) => void;
  /** Expose the editor bridge so the parent can render FormattingToolbar */
  getEditorBridge: () => EditorBridge;
}

interface Props {
  initialContent?: string;
  onChange?: (html: string) => void;
  onBridgeReady?: (bridge: EditorBridge) => void;
  /** Set false to disable internal scroll so an outer ScrollView can scroll everything */
  scrollEnabled?: boolean;
}

// ─── Toolbar button ────────────────────────────────────────────────────────────

function IconBtn({
  active,
  onPressIn,
  children,
}: {
  active?: boolean;
  onPressIn: () => void;
  children: React.ReactNode;
}) {
  const styles = useThemeStyles(createStyles);
  return (
    <TouchableOpacity
      onPressIn={() => { Haptics.selectionAsync(); onPressIn(); }}
      activeOpacity={0.7}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      style={[styles.toolBtn, active && styles.toolBtnActive]}
    >
      {children}
    </TouchableOpacity>
  );
}

// ─── Formatting toolbar (exported — rendered by editor.tsx above EditorActionBar) ─

export function FormattingToolbar({ editor }: { editor: EditorBridge }) {
  const COLORS = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const s = useBridgeState(editor);
  const activeColor = COLORS.brand;
  const inactiveColor = COLORS.textBase;
  const sz = iconSize(18);

  return (
    <View style={styles.toolbar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.toolbarContent}
        keyboardShouldPersistTaps="always"
      >
        <IconBtn active={s.headingLevel === 1} onPressIn={() => editor.toggleHeading(1)}>
          <Heading1 size={sz} color={s.headingLevel === 1 ? activeColor : inactiveColor} strokeWidth={2} />
        </IconBtn>
        <IconBtn active={s.headingLevel === 2} onPressIn={() => editor.toggleHeading(2)}>
          <Heading2 size={sz} color={s.headingLevel === 2 ? activeColor : inactiveColor} strokeWidth={2} />
        </IconBtn>

        <View style={styles.divider} />

        <IconBtn active={s.isBoldActive} onPressIn={() => editor.toggleBold()}>
          <Bold size={sz} color={s.isBoldActive ? activeColor : inactiveColor} strokeWidth={s.isBoldActive ? 2.5 : 2} />
        </IconBtn>
        <IconBtn active={s.isItalicActive} onPressIn={() => editor.toggleItalic()}>
          <Italic size={sz} color={s.isItalicActive ? activeColor : inactiveColor} strokeWidth={2} />
        </IconBtn>
        <IconBtn active={s.isUnderlineActive} onPressIn={() => editor.toggleUnderline()}>
          <UnderlineIcon size={sz} color={s.isUnderlineActive ? activeColor : inactiveColor} strokeWidth={2} />
        </IconBtn>
        <IconBtn active={s.isStrikeActive} onPressIn={() => editor.toggleStrike()}>
          <Strikethrough size={sz} color={s.isStrikeActive ? activeColor : inactiveColor} strokeWidth={2} />
        </IconBtn>

        <View style={styles.divider} />

        <IconBtn active={s.isBulletListActive} onPressIn={() => editor.toggleBulletList()}>
          <List size={sz} color={s.isBulletListActive ? activeColor : inactiveColor} strokeWidth={2} />
        </IconBtn>
        <IconBtn active={s.isOrderedListActive} onPressIn={() => editor.toggleOrderedList()}>
          <ListOrdered size={sz} color={s.isOrderedListActive ? activeColor : inactiveColor} strokeWidth={2} />
        </IconBtn>

        <View style={styles.divider} />

        <IconBtn active={s.isBlockquoteActive} onPressIn={() => editor.toggleBlockquote()}>
          <Quote size={sz} color={s.isBlockquoteActive ? activeColor : inactiveColor} strokeWidth={2} />
        </IconBtn>
      </ScrollView>
    </View>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export const StoryRichEditor = forwardRef<StoryRichEditorRef, Props>(
  function StoryRichEditor({ initialContent = '', onChange, onBridgeReady, scrollEnabled = true }, ref) {
    const styles = useThemeStyles(createStyles);
    const insertionSequence = useRef(0);
    const pendingInsertions = useRef(new Map<string, { resolve: (html: string) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>());
    const handleEditorMessage = React.useCallback((event: WebViewMessageEvent) => {
      let message: { type?: string; requestId?: string; html?: string; error?: string };
      try { message = JSON.parse(event.nativeEvent.data); } catch { return; }
      if (message.type !== 'memento-dictation-result' || !message.requestId) return;
      const pending = pendingInsertions.current.get(message.requestId);
      if (!pending) return;
      clearTimeout(pending.timer);
      pendingInsertions.current.delete(message.requestId);
      if (typeof message.html === 'string') pending.resolve(message.html);
      else pending.reject(new Error(message.error || 'Could not insert the transcript. Your recording is saved for retry.'));
    }, []);
    React.useEffect(() => {
      const pending = pendingInsertions.current;
      return () => {
        pending.forEach(request => { clearTimeout(request.timer); request.reject(new Error('The editor closed. Your recording is saved for retry.')); });
        pending.clear();
      };
    }, []);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const colors = useThemeColors();
    const themeCSS = React.useMemo(() => buildEditorThemeCSS(colors), [colors]);
    const [mementoTheme] = React.useState(() => new BridgeExtension({ extendCSS: themeCSS }));

    const editorTheme = React.useMemo(() => ({
      webview: { backgroundColor: colors.background },
      webviewContainer: { backgroundColor: colors.background },
    }), [colors.background]);
    const editor = useEditorBridge({
      theme: editorTheme,
      autofocus: false,
      initialContent,
      bridgeExtensions: [...TenTapStartKit, mementoTheme],
      onChange: () => {
        editor.getHTML().then(html => {
          onChangeRef.current?.(html);
        });
      },
    });

    const { isReady } = useBridgeState(editor);
    const editorRef = useRef(editor);
    editorRef.current = editor;
    React.useEffect(() => {
      if (isReady) editorRef.current.injectCSS(themeCSS, 'memento-theme');
    }, [isReady, themeCSS]);

    // Expose the bridge to the parent so it can render FormattingToolbar
    React.useEffect(() => {
      onBridgeReady?.(editor);
    // onBridgeReady is stable (useCallback in parent), editor is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useImperativeHandle(ref, () => ({
      getHTML: () => editor.getHTML(),
      beginDictation: () => editor.injectJS(BEGIN_DICTATION_BOOKMARK),
      insertDictation: (text: string) => new Promise<string>((resolve, reject) => {
        const requestId = `dictation-${++insertionSequence.current}`;
        const timer = setTimeout(() => {
          pendingInsertions.current.delete(requestId);
          reject(new Error('The editor did not confirm insertion. Your recording is saved for retry.'));
        }, 10000);
        pendingInsertions.current.set(requestId, { resolve, reject, timer });
        editor.injectJS(insertDictationScript(text, requestId));
      }),
      focus: () => editor.focus('end'),
      setContent: (html: string) => editor.setContent(html),
      getEditorBridge: () => editor,
    }));

    return (
      <View style={scrollEnabled ? styles.container : styles.containerExpand}>
        <RichText
          editor={editor}
          onMessage={handleEditorMessage}
          exclusivelyUseCustomOnMessage={false}
          style={scrollEnabled ? styles.richText : styles.richTextExpand}
          scrollEnabled={scrollEnabled}
        />
      </View>
    );
  }
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  // scrollEnabled=true (default) — WebView fills remaining space
  container: { flex: 1 },
  richText: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // scrollEnabled=false — WebView grows with content for outer ScrollView
  containerExpand: {
    flexShrink: 0,
    minHeight: 200,
  },
  richTextExpand: {
    minHeight: 200,
    backgroundColor: COLORS.background,
  },

  // Toolbar (used by FormattingToolbar exported above)
  toolbar: {
    borderTopWidth: 1,
    borderTopColor: COLORS.strokeWeaker,
    backgroundColor: COLORS.background,
  },
  toolbarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 2,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.strokeWeaker,
    marginHorizontal: 6,
  },

  toolBtn: {
    width: minTouchTarget(36),
    height: minTouchTarget(36),
    borderRadius: radius(8),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  toolBtnActive: {
    backgroundColor: COLORS.fillWeak,
    borderWidth: 1,
    borderColor: COLORS.strokeWeak,
  },
});
