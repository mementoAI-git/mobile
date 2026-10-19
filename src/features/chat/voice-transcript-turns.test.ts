import { describe, expect, test } from 'bun:test';

import { mergeVoiceTranscript, VoiceTranscriptTurns } from './voice-transcript-turns';

describe('VoiceTranscriptTurns', () => {
  test('combines incremental fragments within one turn', () => {
    const turns = new VoiceTranscriptTurns();

    // User transcript arrives as a complete final utterance from Gemini STT.
    expect(turns.appendUser('hello there')).toBe('hello there');
    // Model transcript streams word-by-word; smart space-join keeps words separate.
    expect(turns.appendModel('hi')).toBe('hi');
    expect(turns.appendModel('!')).toBe('hi!');     // punctuation: no space
    expect(turns.appendModel('How')).toBe('hi! How'); // word: space inserted
    turns.completeTurn();

    expect(turns.drainCompleted()).toEqual([
      {
        messages: [
          { role: 'user', text: 'hello there', is_voice: true },
          { role: 'ai', text: 'hi! How', is_voice: true },
        ],
      },
    ]);
  });

  test('merges cumulative snapshots, deltas, overlap, and duplicate frames', () => {
    expect(mergeVoiceTranscript('Hello', 'Hello there')).toBe('Hello there');
    expect(mergeVoiceTranscript('Hello there', 'there friend')).toBe('Hello there friend');
    expect(mergeVoiceTranscript('Hello there', 'Hello there')).toBe('Hello there');
    expect(mergeVoiceTranscript('Hello', ', friend')).toBe('Hello, friend');
    expect(mergeVoiceTranscript('I go', 'good idea')).toBe('I go good idea');
  });

  test('does not duplicate cumulative model transcript snapshots', () => {
    const turns = new VoiceTranscriptTurns();
    turns.appendModel('Welcome');
    turns.appendModel('Welcome back');
    turns.appendModel('back, friend.');
    turns.completeTurn();

    expect(turns.getSessionTurns()[0].messages).toEqual([
      { role: 'ai', text: 'Welcome back, friend.', is_voice: true },
    ]);
  });

  test('preserves the transcribed model fragment when interrupted', () => {
    const turns = new VoiceTranscriptTurns();
    turns.appendModel('I was just saying');
    turns.appendUser('Actually', true);
    turns.handleInterruption();
    turns.completeTurn();

    expect(turns.getSessionTurns()[0].messages).toEqual([
      { role: 'user', text: 'Actually', is_voice: true },
      { role: 'ai', text: 'I was just saying', is_voice: true },
    ]);
  });

  test('replaces a corrected snapshot instead of keeping both versions', () => {
    expect(mergeVoiceTranscript('I went to Lagos', 'I went to Abuja')).toBe('I went to Abuja');
    expect(
      mergeVoiceTranscript('We visited my grandmother in Ibadan', 'We visited my grandmother in Oyo'),
    ).toBe('We visited my grandmother in Oyo');
    // Real continuations still append.
    expect(mergeVoiceTranscript('I went to the', 'market')).toBe('I went to the market');
    expect(mergeVoiceTranscript('we went to the market and', 'we went home')).toBe(
      'we went to the market and we went home',
    );
  });

  test('a new utterance right after a turn ends starts the next turn instead of joining the last', () => {
    const turns = new VoiceTranscriptTurns();
    turns.appendUser('Tell me about Lagos', false);
    turns.appendModel('Lagos is busy and bright.');
    turns.beginTurnCompletion();

    // Within the settle window, but clearly not the same line.
    turns.appendUser('Actually I have another question', false);
    turns.settlePendingTurn();
    turns.completeTurn();

    expect(turns.getSessionTurns()).toEqual([
      {
        messages: [
          { role: 'user', text: 'Tell me about Lagos', is_voice: true },
          { role: 'ai', text: 'Lagos is busy and bright.', is_voice: true },
        ],
      },
      { messages: [{ role: 'user', text: 'Actually I have another question', is_voice: true }] },
    ]);
  });

  test('speech right after a greeting is not attached to the greeting', () => {
    const turns = new VoiceTranscriptTurns();
    turns.appendModel('Hi! How are you today?');
    turns.beginTurnCompletion();

    turns.appendUser('I am good thanks', false);
    turns.settlePendingTurn();
    turns.completeTurn();

    expect(turns.getSessionTurns()).toEqual([
      { messages: [{ role: 'ai', text: 'Hi! How are you today?', is_voice: true }] },
      { messages: [{ role: 'user', text: 'I am good thanks', is_voice: true }] },
    ]);
  });

  test('keeps new interim speech separate while late finals amend the pending turn', () => {
    const turns = new VoiceTranscriptTurns();
    turns.appendUser('First thought', true);
    turns.appendModel('First answer');
    turns.beginTurnCompletion();

    turns.appendUser('First thought corrected', false);
    turns.appendModel('answer completed.');
    turns.appendUser('My next thought', true);
    turns.settlePendingTurn();
    turns.completeTurn();

    expect(turns.getSessionTurns()).toEqual([
      {
        messages: [
          { role: 'user', text: 'First thought corrected', is_voice: true },
          { role: 'ai', text: 'First answer completed.', is_voice: true },
        ],
      },
      {
        messages: [
          { role: 'user', text: 'My next thought', is_voice: true },
        ],
      },
    ]);
  });

  test('captures transcription arriving after an otherwise empty turn boundary', () => {
    const turns = new VoiceTranscriptTurns();
    turns.beginTurnCompletion();
    turns.appendModel('Late final transcript.');
    turns.settlePendingTurn();

    expect(turns.getSessionTurns()).toEqual([
      {
        messages: [
          { role: 'ai', text: 'Late final transcript.', is_voice: true },
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

  test('preserves cumulative session turns even after draining completed turns', () => {
    const turns = new VoiceTranscriptTurns();
    expect(turns.hasSessionTurns()).toBe(false);
    expect(turns.getSessionTurns()).toEqual([]);

    turns.appendUser('hello');
    turns.appendModel('hi there');
    turns.completeTurn();

    expect(turns.hasSessionTurns()).toBe(true);
    expect(turns.getSessionTurns()).toHaveLength(1);

    // Drain completes for network flush
    const drained = turns.drainCompleted();
    expect(drained).toHaveLength(1);
    expect(turns.hasTurns()).toBe(false);

    // Session turns remain preserved for final call summary
    expect(turns.hasSessionTurns()).toBe(true);
    expect(turns.getSessionTurns()).toHaveLength(1);
    expect(turns.getSessionTurns()[0].messages[0].text).toBe('hello');
  });

  test('replaces interim transcript updates progressively without repeating fragments', () => {
    const turns = new VoiceTranscriptTurns();

    expect(turns.appendUser('I was', true)).toBe('I was');
    expect(turns.appendUser('I was thinking', true)).toBe('I was thinking');
    expect(turns.appendUser('I was thinking about home', false)).toBe('I was thinking about home');

    turns.completeTurn();
    expect(turns.drainCompleted()).toEqual([
      { messages: [{ role: 'user', text: 'I was thinking about home', is_voice: true }] },
    ]);
  });

  test('falls back to latest interim user speech if turn completes before finalization', () => {
    const turns = new VoiceTranscriptTurns();

    turns.appendUser('Unfinalized speech', true);
    turns.completeTurn();

    expect(turns.drainCompleted()).toEqual([
      { messages: [{ role: 'user', text: 'Unfinalized speech', is_voice: true }] },
    ]);
  });
});

describe('live chat transcript snapshot', () => {
  test('includes completed, pending, and in-progress speech without draining or duplicating turns', () => {
    const turns = new VoiceTranscriptTurns();
    turns.appendModel('Hello');
    turns.completeTurn();
    turns.appendUser('My story');
    turns.appendModel('Tell me more');
    turns.beginTurnCompletion();
    turns.appendUser('Another memory', true);
    expect(turns.getTimelineMessages().map(message => message.text)).toEqual(['Hello', 'My story', 'Tell me more', 'Another memory']);
    expect(turns.getTimelineMessages()).toEqual(turns.getTimelineMessages());
    expect(turns.drainCompleted()).toHaveLength(1);
  });
});
