import { describe, expect, test } from 'bun:test';
import { EMOJI_CATEGORIES, insertEmojiAtPosition } from './emoji-data';

describe('emoji picker & data', () => {
  test('contains rich categorized emoji lists', () => {
    expect(EMOJI_CATEGORIES.length).toBeGreaterThanOrEqual(4);
    const smileys = EMOJI_CATEGORIES.find((c) => c.id === 'smileys');
    expect(smileys).toBeDefined();
    expect(smileys?.emojis).toContain('😊');
    expect(smileys?.emojis).toContain('😍');

    const hearts = EMOJI_CATEGORIES.find((c) => c.id === 'hearts');
    expect(hearts).toBeDefined();
    expect(hearts?.emojis).toContain('❤️');
  });

  test('inserts emoji at cursor position', () => {
    const text = 'Hello world';
    const { newText, newCursor } = insertEmojiAtPosition(text, '✨', { start: 5, end: 5 });
    expect(newText).toBe('Hello✨ world');
    expect(newCursor).toBe(5 + '✨'.length);
  });

  test('replaces selected text range with emoji', () => {
    const text = 'Hello world';
    const { newText, newCursor } = insertEmojiAtPosition(text, '🔥', { start: 6, end: 11 });
    expect(newText).toBe('Hello 🔥');
    expect(newCursor).toBe(6 + '🔥'.length);
  });

  test('appends emoji at end if selection is at the end', () => {
    const text = 'Great';
    const { newText } = insertEmojiAtPosition(text, '👍', { start: 5, end: 5 });
    expect(newText).toBe('Great👍');
  });

  test('ChatInput mounts EmojiPickerSheet and Smile trigger', async () => {
    const chatInput = await Bun.file(
      new URL('../../components/chat/ChatInput.tsx', import.meta.url),
    ).text();
    const pickerSheet = await Bun.file(
      new URL('../../components/chat/EmojiPickerSheet.tsx', import.meta.url),
    ).text();

    expect(chatInput).toContain('<EmojiPickerSheet');
    expect(chatInput).toContain('handleOpenEmojiPicker');
    expect(chatInput).toContain('<Smile');
    expect(pickerSheet).toContain('export const EmojiPickerSheet');
  });
});
