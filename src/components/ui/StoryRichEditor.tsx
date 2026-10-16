/**
 * StoryRichEditor — Tiptap-powered WYSIWYG body editor for story mode.
 *
 * FormattingToolbar is exported separately so it can be rendered
 * in editor.tsx between the attachment strip and EditorActionBar.
 */

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
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
import { COLORS } from '@/constants/tokens';
import { TYPE_METRICS } from '@/constants/typography';
import { minTouchTarget, radius, iconSize } from '@/constants/responsive';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StoryRichEditorRef {
  getHTML: () => Promise<string>;
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
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    // Static CSS extension — bundled into the initial WebView HTML so it
    // applies on first render, before any isReady event fires.
    const mementoTheme = React.useMemo(() => new BridgeExtension({
      extendCSS: `
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; padding: 0; background: #ffffff; }
        .tiptap, .ProseMirror {
          padding: 8px 20px 20px 20px !important;
          font-size: ${TYPE_METRICS.body.fontSize}px;
          line-height: ${TYPE_METRICS.body.lineHeight}px;
          color: rgba(23,11,0,0.65);
          font-family: -apple-system, sans-serif;
          outline: none;
          word-break: break-word;
        }
        .tiptap p, .ProseMirror p { margin: 0 0 8px 0; }
        .tiptap h1, .ProseMirror h1 { font-size: ${TYPE_METRICS.screenTitle.fontSize}px; line-height: ${TYPE_METRICS.screenTitle.lineHeight}px; font-weight: 700; margin: 0 0 8px 0; color: rgba(23,11,0,0.9); }
        .tiptap h2, .ProseMirror h2 { font-size: ${TYPE_METRICS.sectionTitle.fontSize}px; line-height: ${TYPE_METRICS.sectionTitle.lineHeight}px; font-weight: 600; margin: 0 0 8px 0; color: rgba(23,11,0,0.9); }
        .tiptap u, .ProseMirror u { text-decoration: underline; text-decoration-color: rgba(23,11,0,0.4); text-underline-offset: 3px; }
        .tiptap strong, .ProseMirror strong { color: rgba(23,11,0,0.9); }
        .tiptap em, .ProseMirror em { color: rgba(23,11,0,0.65); }
        .tiptap s, .ProseMirror s { text-decoration: line-through; color: rgba(23,11,0,0.4); }
        .tiptap ul, .ProseMirror ul, .tiptap ol, .ProseMirror ol { padding-left: 20px; margin: 0 0 8px 0; }
        .tiptap blockquote, .ProseMirror blockquote { border-left: 3px solid #E98246; padding-left: 12px; margin: 0 0 8px 0; color: rgba(23,11,0,0.45); font-style: italic; }
        .tiptap .ProseMirror-focused { outline: none; }
        .ProseMirror-placeholder { color: rgba(23,11,0,0.2); pointer-events: none; }
      `,
    }), []);

    const editor = useEditorBridge({
      autofocus: false,
      initialContent,
      bridgeExtensions: [...TenTapStartKit, mementoTheme],
      onChange: () => {
        editor.getHTML().then(html => {
          onChangeRef.current?.(html);
        });
      },
    });

    // Expose the bridge to the parent so it can render FormattingToolbar
    React.useEffect(() => {
      onBridgeReady?.(editor);
    // onBridgeReady is stable (useCallback in parent), editor is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useImperativeHandle(ref, () => ({
      getHTML: () => editor.getHTML(),
      focus: () => editor.focus('end'),
      setContent: (html: string) => editor.setContent(html),
      getEditorBridge: () => editor,
    }));

    return (
      <View style={scrollEnabled ? styles.container : styles.containerExpand}>
        <RichText
          editor={editor}
          style={scrollEnabled ? styles.richText : styles.richTextExpand}
          scrollEnabled={scrollEnabled}
        />
      </View>
    );
  }
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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
