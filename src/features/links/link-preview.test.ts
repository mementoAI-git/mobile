import { describe, expect, test } from 'bun:test';
import { extractUrls, fetchOgData } from '@/hooks/use-link-preview';

describe('OpenGraph link previews', () => {
  test('extracts URLs from plain text and sentence boundaries', () => {
    const text = 'Here is a link https://www.figma.com/design/12345/App and another https://github.com/memento.';
    const urls = extractUrls(text);
    expect(urls).toEqual([
      'https://www.figma.com/design/12345/App',
      'https://github.com/memento',
    ]);
  });

  test('extracts URLs from HTML editor markup', () => {
    const html = '<p>Check out this design <a href="https://www.figma.com/design/L833TjN4jTwtId2WPQID7x/Memento-AI">Figma Link</a></p><p>Also https://apple.com</p>';
    const urls = extractUrls(html);
    expect(urls).toContain('https://www.figma.com/design/L833TjN4jTwtId2WPQID7x/Memento-AI');
    expect(urls).toContain('https://apple.com');
  });

  test('handles URL encoded entities and query parameters', () => {
    const urlText = 'https://example.com/search?q=test&amp;category=mobile';
    const urls = extractUrls(urlText);
    expect(urls).toEqual(['https://example.com/search?q=test&category=mobile']);
  });

  test('editor, quick capture sheet, and create memory include LinkPreviews', async () => {
    const editor = await Bun.file(
      new URL('../../../app/editor.tsx', import.meta.url),
    ).text();
    const quickCapture = await Bun.file(
      new URL('../../components/sheets/QuickCaptureSheet.tsx', import.meta.url),
    ).text();
    const createMemory = await Bun.file(
      new URL('../../components/sheets/CreateMemorySheet.tsx', import.meta.url),
    ).text();
    const fullCreate = await Bun.file(
      new URL('../../../app/create.tsx', import.meta.url),
    ).text();

    expect(editor).toContain('<LinkPreviews variant="composer" text={storyLinkText');
    expect(editor).toContain('!dismissedLinks.includes(url)');
    expect(editor).toContain('<LinkPreviews text={qcBody}');
    expect(quickCapture).toContain('<LinkPreviews text={text}');
    expect(createMemory).toContain('<LinkPreviews text={body}');
    expect(fullCreate).toContain('<LinkPreviews text={body}');
  });
});

 test('loads metadata on native fetch responses without streaming bodies', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => ({ ok: true, body: undefined, text: async () => '<title>Example story</title><meta property="og:description" content="A preview"><meta property="og:image" content="/cover.png">' })) as unknown as typeof fetch;
  try {
    expect(await fetchOgData('https://example.com/story')).toEqual({ title: 'Example story', description: 'A preview', imageUrl: 'https://example.com/cover.png' });
  } finally { globalThis.fetch = originalFetch; }
});
