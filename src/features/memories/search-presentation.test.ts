import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { searchHighlightParts, searchPictureOf, searchStatusText } from './search-presentation';
import { parseRecentMemories, withRecentMemory } from './recent-memories';

describe('search sheet (web parity)', () => {
  test('marks every search word, longest first, case-insensitively', () => {
    expect(searchHighlightParts('My Grandma garden', 'garden grand')).toEqual([
      { text: 'My ', match: false },
      { text: 'Grand', match: true },
      { text: 'ma ', match: false },
      { text: 'garden', match: true },
    ]);
    expect(searchHighlightParts('Plain', '')).toEqual([{ text: 'Plain', match: false }]);
  });

  test('picks the first picture attachment', () => {
    expect(searchPictureOf([{ url: 'a.m4a', type: 'audio/m4a' }, { url: 'b.jpg' }])?.url).toBe('b.jpg');
    expect(searchPictureOf([{ url: 'a.pdf', type: 'application/pdf' }])).toBeNull();
    expect(searchPictureOf(undefined)).toBeNull();
  });

  test('uses web status wording', () => {
    expect(searchStatusText({ isSearching: true, failed: false })).toBe('Searching your memories…');
    expect(searchStatusText({ isSearching: false, failed: true })).toBeNull();
    expect(searchStatusText({ isSearching: false, failed: false, search: { mode: 'keyword' } })).toBe('Searching words in your memories.');
    expect(searchStatusText({ isSearching: false, failed: false, search: { mode: 'hybrid' } })).toBe('Searches your saved memories, stories and chats.');
  });

  test('keeps the five most recently opened memories, newest first', () => {
    let list = parseRecentMemories(null);
    for (const id of ['1', '2', '3', '4', '5', '6']) list = withRecentMemory(list, { _id: id, title: id });
    list = withRecentMemory(list, { _id: '3', title: '3' });
    expect(list.map((m) => m._id)).toEqual(['3', '6', '5', '4', '2']);
    expect(parseRecentMemories('nope')).toEqual([]);
  });

  test('search input follows the input rule: 8px corners, never a pill', () => {
    const sheet = readFileSync('src/components/sheets/SearchMemorySheet.tsx', 'utf8');
    expect(sheet).toContain('borderRadius: INPUT_RADIUS');
    expect(sheet).not.toMatch(/borderRadius: 999,\n\s*borderWidth: 1,\n\s*borderColor: COLORS\.strokeWeaker/);
    expect(readFileSync('src/components/sheets/SheetManager.tsx', 'utf8')).toContain('screenHeightRatio: 0.8');
  });
});
