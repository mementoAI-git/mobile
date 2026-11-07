import { describe, expect, test } from 'bun:test';
import { collectReplySources, mementoRoute, parseMementoPath } from './memento-links';
import { splitMessageBlocks, tokenizeMessageMarkdown } from './message-markdown';

const LAGOS = '64b7f0c2a1b2c3d4e5f60711';
const CHAT = '64b7f0c2a1b2c3d4e5f60733';

describe('memento links in chat replies', () => {
  test('opens stories and conversations in the app', () => {
    expect(mementoRoute(parseMementoPath(`/stories/${LAGOS}`)!)).toEqual({ pathname: '/(tabs)/stories/[id]', params: { id: LAGOS } });
    expect(mementoRoute(parseMementoPath(`/chat/${CHAT}`)!)).toEqual({ pathname: '/chat/[id]', params: { id: CHAT } });
    expect(parseMementoPath('/stories/nope')).toBeNull();
    expect(parseMementoPath('https://example.com/stories/' + LAGOS)).toBeNull();
  });

  test('tokenizes in-app links as links', () => {
    expect(tokenizeMessageMarkdown(`See [Trip to Lagos](/stories/${LAGOS}).`)).toEqual([
      { type: 'text', text: 'See ' },
      { type: 'link', label: 'Trip to Lagos', url: `/stories/${LAGOS}` },
      { type: 'text', text: '.' },
    ]);
  });

  test('lists each linked memory once as a source', () => {
    const text = `[A](/stories/${LAGOS}) [A again](/stories/${LAGOS}) [B](/chat/${CHAT}) [web](https://example.com)`;
    expect(collectReplySources(text).map((source) => source.label)).toEqual(['A', 'B']);
  });
});

describe('message blocks', () => {
  test('splits paragraphs, headings, lists and quotes', () => {
    expect(splitMessageBlocks('## Plan\nFirst line\nsecond line\n\n- One\n  - Nested\n* Two\n1. Uno\n2) Dos\n> quoted\n> more')).toEqual([
      { type: 'heading', text: 'Plan', level: 2 },
      { type: 'paragraph', text: 'First line\nsecond line' },
      { type: 'bullet', text: 'One', depth: 0 },
      { type: 'bullet', text: 'Nested', depth: 1 },
      { type: 'bullet', text: 'Two', depth: 0 },
      { type: 'ordered', text: 'Uno', marker: '1.', depth: 0 },
      { type: 'ordered', text: 'Dos', marker: '2.', depth: 0 },
      { type: 'quote', text: 'quoted\nmore' },
    ]);
  });

  test('keeps a plain message as one paragraph', () => {
    expect(splitMessageBlocks('Just a **reply**.')).toEqual([{ type: 'paragraph', text: 'Just a **reply**.' }]);
  });

  test('does not mistake a bold word at the start for a bullet', () => {
    expect(splitMessageBlocks('**Bold** start')[0].type).toBe('paragraph');
  });
});
