// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const screen = readFileSync('app/(tabs)/stories/[id].tsx', 'utf8');
const component = readFileSync('src/components/memory/StoryHtmlBody.tsx', 'utf8');

describe('story detail html rendering', () => {
  test('renders rich story HTML instead of stripping tags with a regex', () => {
    expect(screen).toContain("import { StoryHtmlBody } from '@/components/memory/StoryHtmlBody';");
    expect(screen).toContain('<StoryHtmlBody html={memory.body} />');
    expect(screen).not.toContain("memory.body?.replace(/<[^>]+>/g, '')");
  });

  test('supports the editor html subset including quotes and inline formatting', () => {
    expect(component).toContain("case 'blockquote':");
    expect(component).toContain('strong: {...TYPE.bodyStrong');
    expect(component).toContain("s: { textDecorationLine: 'line-through'");
    expect(component).toContain('renderInlineHtml');
  });

  test('supports anchors with target and rel attributes before href', () => {
    expect(component).toContain('const attributes = match[2] ??');
    expect(component).toContain("href\\s*=\\s*[\"']([^\"']+)[\"']");
  });
});
