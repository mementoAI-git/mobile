import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { storyComposerPaperFrame } from './story-composer-paper';
import { buildEditorThemeCSS } from './editor-theme';
import { COLORS } from '@/constants/tokens';

describe('add story album paper', () => {
  test('sizes the paper like web: max(131.3vw, 150dvh), 3:2, pulled 3.65% right', () => {
    const frame = storyComposerPaperFrame(390, 844);
    expect(frame.width).toBe(1266);
    expect(frame.height).toBe(844);
    expect(frame.right).toBeCloseTo(-46.209, 2);
  });

  test('switches artwork with appearance and only adds grain on light', () => {
    const source = readFileSync('src/components/editor/StoryComposerBackdrop.tsx', 'utf8');
    expect(source).toContain('useResolvedAppearance');
    expect(source).toContain('dark ? ALBUM_DARK : ALBUM_LIGHT');
    expect(source).toContain('{!dark && (');
  });

  test('the add story editor lets the paper show through', () => {
    const editor = readFileSync('app/editor.tsx', 'utf8');
    expect(editor).toContain('const showComposerPaper = isStory && !isEditing;');
    expect(editor).toContain('transparent={showComposerPaper}');
    expect(buildEditorThemeCSS(COLORS as any, { transparent: true })).toContain('background: transparent');
  });
});
