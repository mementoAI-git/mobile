/**
 * StoryRichEditor — Tiptap-powered WYSIWYG body editor for story mode.
 *
 * Critical implementation notes:
 * 1. `onPressIn` on toolbar buttons fires BEFORE WebView blur, preserving selection.
 * 2. `onChange` ref pattern avoids stale closure / infinite re-render loop.
 *    Using a ref for the callback means the `useEditorBridge` onChange option
 *    never re-creates the bridge, yet always calls the latest parent handler.
 * 3. `useEditorContent` is NOT used — it re-renders on every keystroke and,
 *    combined with an unstable `onChange` prop, creates an infinite render loop.
 *    Instead we use the `onChange` option in `useEditorBridge` directly.
 */

import React, { forwardRef, useImperativeHandle, useRef, useMemo, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import {
  RichText,
  useEditorBridge,
  useBridgeState,
  TenTapStartKit,
} from '@10play/tentap-editor';
import * as Haptics from 'expo-haptics';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, List, ListOrdered, Quote,
} from 'lucide-react-native';
import { COLORS } from '@/constants/tokens';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function debounce<T extends (...args: any[]) => void>(func: T, wait: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const debounced = function(this: any, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
  return debounced;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StoryRichEditorRef {
  getHTML: () => Promise<string>;
  setContent: (content: string) => void;
  focus: () => void;
}

interface Props {
  initialContent?: string;
  onChange?: (html: string) => void;
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
      style={[styles.toolBtn, active && styles.toolBtnActive]}
    >
      {children}
    </TouchableOpacity>
  );
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────

function FormattingToolbar({ editor }: { editor: ReturnType<typeof useEditorBridge> }) {
  const s = useBridgeState(editor);
  const active = COLORS.brand;
  const inactive = COLORS.textBase;
  const sz = 18;

  // onPressIn fires before WebView blur — selection is still active, call commands directly.
  return (
    <View style={styles.toolbar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.toolbarContent}
        keyboardShouldPersistTaps="always"
      >
        <IconBtn active={s.headingLevel === 1} onPressIn={() => editor.toggleHeading(1)}>
          <Heading1 size={sz} color={s.headingLevel === 1 ? active : inactive} strokeWidth={2} />
        </IconBtn>
        <IconBtn active={s.headingLevel === 2} onPressIn={() => editor.toggleHeading(2)}>
          <Heading2 size={sz} color={s.headingLevel === 2 ? active : inactive} strokeWidth={2} />
        </IconBtn>

        <View style={styles.divider} />

        <IconBtn active={s.isBoldActive} onPressIn={() => editor.toggleBold()}>
          <Bold size={sz} color={s.isBoldActive ? active : inactive} strokeWidth={s.isBoldActive ? 2.5 : 2} />
        </IconBtn>
        <IconBtn active={s.isItalicActive} onPressIn={() => editor.toggleItalic()}>
          <Italic size={sz} color={s.isItalicActive ? active : inactive} strokeWidth={2} />
        </IconBtn>
        <IconBtn active={s.isUnderlineActive} onPressIn={() => editor.toggleUnderline()}>
          <UnderlineIcon size={sz} color={s.isUnderlineActive ? active : inactive} strokeWidth={2} />
        </IconBtn>
        <IconBtn active={s.isStrikeActive} onPressIn={() => editor.toggleStrike()}>
          <Strikethrough size={sz} color={s.isStrikeActive ? active : inactive} strokeWidth={2} />
        </IconBtn>

        <View style={styles.divider} />

        <IconBtn active={s.isBulletListActive} onPressIn={() => editor.toggleBulletList()}>
          <List size={sz} color={s.isBulletListActive ? active : inactive} strokeWidth={2} />
        </IconBtn>
        <IconBtn active={s.isOrderedListActive} onPressIn={() => editor.toggleOrderedList()}>
          <ListOrdered size={sz} color={s.isOrderedListActive ? active : inactive} strokeWidth={2} />
        </IconBtn>

        <View style={styles.divider} />

        <IconBtn active={s.isBlockquoteActive} onPressIn={() => editor.toggleBlockquote()}>
          <Quote size={sz} color={s.isBlockquoteActive ? active : inactive} strokeWidth={2} />
        </IconBtn>
      </ScrollView>
    </View>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export const StoryRichEditor = React.memo(
  forwardRef<StoryRichEditorRef, Props>(
    function StoryRichEditor({ initialContent = '', onChange }, ref) {
      // Use a ref for onChange to avoid recreating the bridge when the parent
      // re-renders (which would pass a new function reference).
      const onChangeRef = useRef(onChange);
      onChangeRef.current = onChange;

      // Stable ref to editor bridge instance to prevent TDZ crashes during onChange callbacks.
      const editorRef = useRef<ReturnType<typeof useEditorBridge> | null>(null);

      // Debounce onChange updates to prevent bridge traffic overload while typing.
      const debouncedOnChange = useMemo(() => {
        return debounce(() => {
          editorRef.current?.getHTML().then(html => {
            onChangeRef.current?.(html);
          });
        }, 150);
      }, []);

      // Clean up debounce on unmount.
      useEffect(() => {
        return () => {
          debouncedOnChange.cancel();
        };
      }, [debouncedOnChange]);

      const editor = useEditorBridge({
        autofocus: false,
        // Set to false since the parent container is already inside KeyboardAvoidingView.
        avoidIosKeyboard: false,
        initialContent,
        bridgeExtensions: TenTapStartKit,
        onChange: debouncedOnChange,
      });

      // Keep the ref updated with the current editor bridge instance
      editorRef.current = editor;

      const editorState = useBridgeState(editor);

      // Flush debounced changes immediately upon editor blur to avoid race conditions.
      const wasFocused = useRef(false);
      useEffect(() => {
        if (wasFocused.current && !editorState.isFocused) {
          debouncedOnChange.cancel();
          editor.getHTML().then(html => {
            onChangeRef.current?.(html);
          });
        }
        wasFocused.current = editorState.isFocused;
      }, [editorState.isFocused, editor, debouncedOnChange]);



      // Inject brand typography + styles once the editor WebView is ready
      useEffect(() => {
        if (editorState.isReady) {
          editor.injectCSS(`
            @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400..700;1,400..700&family=Inter:wght@400;500;600;700&display=swap');
            * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
            body { margin: 0; padding: 0; background: #fefbf8; }
            .tiptap, .ProseMirror {
              padding: 8px 20px 20px 20px !important;
              font-size: 16px;
              line-height: 1.7;
              color: rgba(23,11,0,0.65);
              font-family: 'Inter', -apple-system, sans-serif;
              outline: none;
              word-break: break-word;
            }
            .tiptap p, .ProseMirror p { margin: 0 0 8px 0; }
            .tiptap h1, .ProseMirror h1 {
              font-family: 'EB Garamond', Georgia, serif;
              font-size: 28px;
              font-weight: 700;
              margin: 0 0 8px 0;
              color: rgba(23,11,0,0.9);
            }
            .tiptap h2, .ProseMirror h2 {
              font-family: 'EB Garamond', Georgia, serif;
              font-size: 22px;
              font-weight: 600;
              margin: 0 0 8px 0;
              color: rgba(23,11,0,0.9);
            }
            .tiptap u, .ProseMirror u { text-decoration: underline; text-decoration-color: rgba(23,11,0,0.4); text-underline-offset: 3px; }
            .tiptap strong, .ProseMirror strong { color: rgba(23,11,0,0.9); }
            .tiptap em, .ProseMirror em { color: rgba(23,11,0,0.65); }
            .tiptap s, .ProseMirror s { text-decoration: line-through; color: rgba(23,11,0,0.4); }
            .tiptap ul, .ProseMirror ul, .tiptap ol, .ProseMirror ol { padding-left: 20px; margin: 0 0 8px 0; }
            .tiptap blockquote, .ProseMirror blockquote {
              font-family: 'EB Garamond', Georgia, serif;
              border-left: 3px solid #FF5E00;
              padding-left: 12px;
              margin: 0 0 8px 0;
              color: rgba(23,11,0,0.45);
              font-style: italic;
            }
            .tiptap .ProseMirror-focused { outline: none; }
            .ProseMirror-placeholder { color: rgba(23,11,0,0.2); pointer-events: none; }
          `, 'memento-style');

          // Inject JS to turn off autocorrect and spellcheck to isolate OS composition highlights
          editor.injectJS(`
            (function() {
              const el = document.querySelector('.ProseMirror');
              if (el) {
                el.setAttribute('spellcheck', 'false');
                el.setAttribute('autocorrect', 'off');
                el.setAttribute('autocapitalize', 'off');
              }
            })();
            true;
          `);
        }
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [editorState.isReady]);

      useImperativeHandle(ref, () => ({
        getHTML: () => editor.getHTML(),
        setContent: (content: string) => editor.setContent(content),
        focus: () => editor.focus('end'),
      }));

      return (
        <View style={styles.container}>
          <RichText editor={editor} style={styles.richText} />
          <FormattingToolbar editor={editor} />
        </View>
      );
    }
  )
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  richText: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

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
    width: 36,
    height: 36,
    borderRadius: 18,
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
