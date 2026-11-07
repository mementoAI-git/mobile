import { describe, expect, test } from 'bun:test';
import { createChatFrameReader } from './stream-frames';

describe('chat stream frames', () => {
  test('reads status frames before the reply, however it is split', () => {
    const stream = '\u001e{"status":"Looking through your stories…"}\n\u001e{"model":"groq:x"}\nYou wrote about Lagos.';
    for (const size of [1, 4, 200]) {
      const statuses: string[] = [];
      const read = createChatFrameReader({ status: (s) => statuses.push(s) });
      let reply = '';
      for (let i = 0; i < stream.length; i += size) reply += read(stream.slice(i, i + size));
      expect(reply).toBe('You wrote about Lagos.');
      expect(statuses).toEqual(['Looking through your stories…']);
    }
  });

  test('passes a plain reply straight through', () => {
    const read = createChatFrameReader({});
    expect(read('Hello')).toBe('Hello');
  });
});
