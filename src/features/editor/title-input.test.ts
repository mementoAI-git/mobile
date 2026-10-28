import { describe, expect, test } from 'bun:test';

import { singleLineTitle } from './title-input';

describe('singleLineTitle', () => {
  test('turns pasted line breaks into single spaces', () => {
    expect(singleLineTitle('Hey you\ntesting the mic')).toBe('Hey you testing the mic');
    expect(singleLineTitle('One \r\n\r\n two')).toBe('One two');
  });

  test('leaves ordinary typing alone, including trailing spaces', () => {
    expect(singleLineTitle('Hey you  testing the mic ')).toBe('Hey you  testing the mic ');
    expect(singleLineTitle('')).toBe('');
  });
});

describe('story editor title field', () => {
  test('wraps long titles, and Return moves to the body', async () => {
    const editor = await Bun.file(new URL('../../../app/editor.tsx', import.meta.url)).text();
    const field = editor.slice(editor.indexOf('ref={titleRef}'), editor.indexOf('onSubmitEditing={() => richEditorRef'));

    expect(field).toContain('multiline');
    expect(field).toContain('submitBehavior="submit"');
    // The handler (shared with voice typing) keeps titles on one line.
    expect(field).toContain('onChangeText={handleTitleChange}');
    const handler = editor.slice(editor.indexOf('const handleTitleChange'), editor.indexOf('const writeStoryByVoice'));
    expect(handler).toContain('singleLineTitle(raw)');
    expect(field).not.toContain('blurOnSubmit');
  });
});

describe('story editor cancel', () => {
  test('connects Cancel to local save and safe back navigation without confirmation', async () => {
    const editor = await Bun.file(new URL('../../../app/editor.tsx', import.meta.url)).text();
    expect(editor).toContain('onPress={handleCancel}');
    expect(editor).toContain('await saveLocalDraft(user?.email, draft)');
    expect(editor).toContain("router.replace('/(tabs)/overview')");
    expect(editor).not.toContain('setCancelConfirmVisible');
    expect(editor).not.toContain('<ConfirmDialog');
  });
});
