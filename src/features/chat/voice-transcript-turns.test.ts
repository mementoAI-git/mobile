import { describe, expect, test } from 'bun:test';

import { VoiceTranscriptTurns } from './voice-transcript-turns';

describe('VoiceTranscriptTurns', () => {
  test('combines incremental fragments within one turn', () => {
    const turns = new VoiceTranscriptTurns();

    expect(turns.appendUser('hello ')).toBe('hello ');
    expect(turns.appendUser('there')).toBe('hello there');
    expect(turns.appendModel('hi')).toBe('hi');
    expect(turns.appendModel('!')).toBe('hi!');
    turns.completeTurn();

    expect(turns.drainCompleted()).toEqual([
      {
        messages: [
          { role: 'user', text: 'hello there', is_voice: true },
          { role: 'ai', text: 'hi!', is_voice: true },
        ],
      },
    ]);
  });

  test('keeps consecutive completed turns separate and omits empty turns', () => {
    const turns = new VoiceTranscriptTurns();
    turns.completeTurn();
    turns.appendUser('first');
    turns.completeTurn();
    turns.appendUser('second');
    turns.appendModel('answer');
    turns.completeTurn();

    expect(turns.drainCompleted()).toEqual([
      { messages: [{ role: 'user', text: 'first', is_voice: true }] },
      {
        messages: [
          { role: 'user', text: 'second', is_voice: true },
          { role: 'ai', text: 'answer', is_voice: true },
        ],
      },
    ]);
  });

  test('preserves only the received part of an interrupted model response', () => {
    const turns = new VoiceTranscriptTurns();
    turns.appendModel('I was saying');
    turns.completeTurn();

    expect(turns.drainCompleted()).toEqual([
      { messages: [{ role: 'ai', text: 'I was saying', is_voice: true }] },
    ]);
  });

  test('restores a failed turn ahead of later completed work', () => {
    const turns = new VoiceTranscriptTurns();
    turns.appendUser('failed');
    turns.completeTurn();
    const [failed] = turns.drainCompleted();
    turns.appendUser('later');
    turns.completeTurn();

    turns.restoreFailedTurn(failed);

    expect(turns.drainCompleted()).toEqual([
      { messages: [{ role: 'user', text: 'failed', is_voice: true }] },
      { messages: [{ role: 'user', text: 'later', is_voice: true }] },
    ]);
  });

  test('reports hasTurns accurately', () => {
    const turns = new VoiceTranscriptTurns();
    expect(turns.hasTurns()).toBe(false);
    turns.appendUser('hello');
    expect(turns.hasTurns()).toBe(false);
    turns.completeTurn();
    expect(turns.hasTurns()).toBe(true);
    turns.drainCompleted();
    expect(turns.hasTurns()).toBe(false);
  });
});
