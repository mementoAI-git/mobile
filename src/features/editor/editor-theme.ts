import type { ThemeColors } from '@/constants/tokens';
import { TYPE_METRICS } from '@/constants/typography';

/** `transparent` lets a page backdrop (the add-story album paper) show through the WebView. */
export function buildEditorThemeCSS(colors: ThemeColors, { transparent = false }: { transparent?: boolean } = {}): string {
  return `
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; padding: 0; background: ${transparent ? 'transparent' : colors.background}; color: ${colors.textBase}; caret-color: ${colors.textStrong}; }
        .tiptap, .ProseMirror {
          padding: 8px 20px 20px 20px !important;
          font-size: ${TYPE_METRICS.body.fontSize}px;
          line-height: ${TYPE_METRICS.body.lineHeight}px;
          color: ${colors.textBase};
          font-family: ui-rounded, -apple-system, sans-serif;
          outline: none;
          word-break: break-word;
        }
        .tiptap ::selection, .ProseMirror ::selection, .tiptap::selection, .ProseMirror::selection {
          background-color: ${colors.activeFill} !important;
          color: ${colors.activeText} !important;
          -webkit-text-fill-color: ${colors.activeText} !important;
        }
        .tiptap .highlight-background, .ProseMirror .highlight-background,
        .tiptap .highlight-background *, .ProseMirror .highlight-background * {
          background-color: ${colors.activeFill} !important;
          color: ${colors.activeText} !important;
          -webkit-text-fill-color: ${colors.activeText} !important;
        }
        .tiptap p, .ProseMirror p { margin: 0 0 8px 0; }
        .tiptap h1, .ProseMirror h1 { font-size: ${TYPE_METRICS.screenTitle.fontSize}px; line-height: ${TYPE_METRICS.screenTitle.lineHeight}px; font-weight: 700; margin: 0 0 8px 0; color: ${colors.textStrong}; }
        .tiptap h2, .ProseMirror h2 { font-size: ${TYPE_METRICS.sectionTitle.fontSize}px; line-height: ${TYPE_METRICS.sectionTitle.lineHeight}px; font-weight: 600; margin: 0 0 8px 0; color: ${colors.textStrong}; }
        .tiptap u, .ProseMirror u { text-decoration: underline; text-decoration-color: ${colors.textWeak}; text-underline-offset: 3px; }
        .tiptap strong, .ProseMirror strong { color: ${colors.textStrong}; }
        .tiptap em, .ProseMirror em { color: ${colors.textBase}; }
        .tiptap s, .ProseMirror s { text-decoration: line-through; color: ${colors.textWeak}; }
        .tiptap ul, .ProseMirror ul, .tiptap ol, .ProseMirror ol { padding-left: 20px; margin: 0 0 8px 0; }
        .tiptap blockquote, .ProseMirror blockquote { border-left: 3px solid ${colors.brand}; padding-left: 12px; margin: 0 0 8px 0; color: ${colors.textWeak}; font-style: italic; }
        .tiptap .ProseMirror-focused { outline: none; }
        .ProseMirror-placeholder { color: ${colors.textMuted}; pointer-events: none; }
        .tiptap a, .ProseMirror a { color: ${colors.brand}; }
        .tiptap p.is-editor-empty:first-child::before { color: ${colors.textMuted}; }

  `;
}
