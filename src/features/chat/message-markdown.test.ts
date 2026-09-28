import { describe, expect, it } from 'bun:test';
import { tokenizeMessageMarkdown } from './message-markdown';

describe('tokenizeMessageMarkdown', () => {
  it('parses italic asterisks in conversational messages (e.g. *you*)', () => {
    const tokens = tokenizeMessageMarkdown("what's new with *you*, Saviour?");
    expect(tokens).toEqual([
      { type: 'text', text: "what's new with " },
      { type: 'italic', text: 'you' },
      { type: 'text', text: ', Saviour?' },
    ]);
  });

  it('parses italic underscores with boundary checks', () => {
    const tokens = tokenizeMessageMarkdown('Hello _world_ and user_id!');
    expect(tokens).toEqual([
      { type: 'text', text: 'Hello ' },
      { type: 'italic', text: 'world' },
      { type: 'text', text: ' and user_id!' },
    ]);
  });

  it('parses bold text with asterisks and underscores', () => {
    const tokens = tokenizeMessageMarkdown('This is **bold** and __also bold__');
    expect(tokens).toEqual([
      { type: 'text', text: 'This is ' },
      { type: 'bold', text: 'bold' },
      { type: 'text', text: ' and ' },
      { type: 'bold', text: 'also bold' },
    ]);
  });

  it('parses bold-italic combined formatting', () => {
    const tokens = tokenizeMessageMarkdown('Here is ***very important*** news');
    expect(tokens).toEqual([
      { type: 'text', text: 'Here is ' },
      { type: 'bold_italic', text: 'very important' },
      { type: 'text', text: ' news' },
    ]);
  });

  it('parses inline code tokens', () => {
    const tokens = tokenizeMessageMarkdown('Run `bun test` to verify');
    expect(tokens).toEqual([
      { type: 'text', text: 'Run ' },
      { type: 'code', text: 'bun test' },
      { type: 'text', text: ' to verify' },
    ]);
  });

  it('parses strikethrough tokens', () => {
    const tokens = tokenizeMessageMarkdown('This was ~~cancelled~~ updated');
    expect(tokens).toEqual([
      { type: 'text', text: 'This was ' },
      { type: 'strikethrough', text: 'cancelled' },
      { type: 'text', text: ' updated' },
    ]);
  });

  it('parses highlight tokens', () => {
    const tokens = tokenizeMessageMarkdown('Please note ==this note== carefully');
    expect(tokens).toEqual([
      { type: 'text', text: 'Please note ' },
      { type: 'highlight', text: 'this note' },
      { type: 'text', text: ' carefully' },
    ]);
  });

  it('parses markdown links and bare URLs without corrupting trailing punctuation', () => {
    const tokens = tokenizeMessageMarkdown(
      'Check [Memento](https://memento.app) or see https://example.com/info.',
    );
    expect(tokens).toEqual([
      { type: 'text', text: 'Check ' },
      { type: 'link', label: 'Memento', url: 'https://memento.app' },
      { type: 'text', text: ' or see ' },
      { type: 'url', url: 'https://example.com/info' },
      { type: 'text', text: '.' },
    ]);
  });

  it('does not falsely tokenize math or isolated asterisks', () => {
    const tokens = tokenizeMessageMarkdown('2 * 3 = 6');
    expect(tokens).toEqual([{ type: 'text', text: '2 * 3 = 6' }]);
  });

  it('handles empty strings cleanly', () => {
    expect(tokenizeMessageMarkdown('')).toEqual([]);
  });
});
