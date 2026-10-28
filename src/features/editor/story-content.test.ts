import { expect, test } from 'bun:test';
import { hasMeaningfulStoryBodyContent } from './story-content';
test('Cancel recognizes empty editor markup as empty', () => {
  for (const html of ['', '<p></p>', '<p><br></p>', '<p>&nbsp;</p>', '<p> </p><p><br /></p>']) {
    expect(hasMeaningfulStoryBodyContent(html)).toBe(false);
  }
});
test('Cancel preserves actual text', () => {
  expect(hasMeaningfulStoryBodyContent('<p>A memory</p>')).toBe(true);
});
