import {readFileSync} from 'node:fs';
import {describe, expect, test} from 'bun:test';

const editorMediaSurfaces = [
  'app/editor.tsx',
  'app/article.tsx',
  'app/create.tsx',
  'app/share.tsx',
  'app/chat/media.tsx',
  'app/chat/settings.tsx',
  'app/voice-call.tsx',
  'app/coming-soon.tsx',
  'src/components/ui/MediaPreviewModal.tsx',
  'src/components/ui/CameraCaptureModal.tsx',
  'src/components/ui/StoryRichEditor.tsx',
  'src/components/audio/StoryNarrationPlayer.tsx',
];

describe('editor and media typography', () => {
  test.each(editorMediaSurfaces.map((file) => [file]))('%s uses semantic typography roles', (file) => {
    const source = readFileSync(file, 'utf8') + (file.endsWith('StoryRichEditor.tsx') ? readFileSync('src/features/editor/editor-theme.ts', 'utf8') : '');
    const rendersNativeText = /<(?:Animated\.)?Text\b/.test(source);

    expect(source).toContain("@/constants/typography");
    if (rendersNativeText) expect(source).toMatch(/TYPE\./);
    expect(source).not.toMatch(/fontWeight\s*:/);
    expect(source).not.toMatch(/text-\[\d+(?:\.\d+)?px\]/);
    expect(source).not.toMatch(/fontSize\s*:\s*\d+(?:\.\d+)?/);
  });

  test('rich editor metrics come from the global typography authority', () => {
    const typography = readFileSync('src/constants/typography.ts', 'utf8');
    const richEditor = readFileSync('src/features/editor/editor-theme.ts', 'utf8');

    expect(typography).toContain('TYPE_METRICS');
    expect(richEditor).toContain('TYPE_METRICS.body');
    expect(richEditor).toContain('TYPE_METRICS.screenTitle');
    expect(richEditor).toContain('TYPE_METRICS.sectionTitle');
  });
});
