import { describe, expect, test } from 'bun:test';
import { decodeHtmlEntities, parseStoryHtmlBlocks } from './story-html';

describe('story html parsing', () => {
  test('preserves paragraphs, blockquotes, line breaks, and lists from editor HTML', () => {
    const html = '<p><strong>Hello</strong><br><br>World</p><p>Next para</p><blockquote><p>Quoted</p></blockquote><ul><li><p>One</p></li><li>Two</li></ul>';

    expect(parseStoryHtmlBlocks(html)).toEqual([
      { type: 'paragraph', html: '<strong>Hello</strong><br><br>World' },
      { type: 'paragraph', html: 'Next para' },
      { type: 'blockquote', html: 'Quoted' },
      { type: 'ul', items: ['One', 'Two'] },
    ]);
  });

  test('ignores empty paragraph shells', () => {
    expect(parseStoryHtmlBlocks('<p></p><p><br></p><p>&nbsp;</p>')).toEqual([]);
  });

  test('decodes common html entities', () => {
    expect(decodeHtmlEntities('&lt;hello&gt; &amp; &quot;world&quot; &#39;test&#39;')).toBe('<hello> & "world" \'test\'');
  });
});