import { describe, expect, test } from 'bun:test';
import { sendVoiceText } from './voice-text-input';
import { VoiceTranscriptTurns } from './voice-transcript-turns';

describe('typed messages in a voice session', () => {
  test('sends text through the existing audio session and records it once', () => {
    const calls: unknown[] = [];
    const transcript = new VoiceTranscriptTurns();
    sendVoiceText('  Tell me about the sea.  ', {
      ready: true,
      session: { sendClientContent: input => { calls.push(input); } },
      record: text => { transcript.completeTurn(); transcript.appendUser(text); transcript.completeTurn(); },
    });
    transcript.appendModel('The sea is vast.');
    transcript.completeTurn();
    expect(calls).toEqual([{ turns: [{ role: 'user', parts: [{ text: 'Tell me about the sea.' }] }], turnComplete: true }]);
    expect(transcript.getTimelineMessages().map(message => message.text)).toEqual(['Tell me about the sea.', 'The sea is vast.']);
  });
  test('does not save or fall back to a text reply if the connection drops', () => {
    let recorded = false;
    const record = () => { recorded = true; };
    expect(() => sendVoiceText('Hi', { ready: false, session: null, record })).toThrow('reconnecting');
    expect(() => sendVoiceText('Hi', { ready: true, session: { sendClientContent: () => { throw new Error('closed'); } }, record })).toThrow('closed');
    expect(recorded).toBe(false);
  });
});
