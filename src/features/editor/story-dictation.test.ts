import { expect, test } from 'bun:test';
import { appendStoryDictation } from './story-dictation';
test('preserves existing formatting and safely appends dictated text', () => {
  expect(appendStoryDictation('<p><strong>Before</strong></p>', 'A & B < C')).toBe('<p><strong>Before</strong></p><p>A &amp; B &lt; C</p>');
});
test('partial updates replace the recording segment without duplication', () => {
  const before = '<p>Before</p>';
  expect(appendStoryDictation(before, 'Hello world')).toBe('<p>Before</p><p>Hello world</p>');
  expect(appendStoryDictation(before, '')).toBe(before);
});
