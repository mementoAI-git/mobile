import { describe, expect, test } from 'bun:test';

import type { ChatListMessage } from './message-list';
import { groupVoiceCallThreads } from './voice-call-threads';
import { isVoiceCallMessage, parseVoiceCallMessage } from './voice-transcript-parser';

const at = (seconds: number) => new Date(Date.UTC(2026, 9, 1, 9, 0, seconds)).toISOString();

const turn = (index: number, role: 'user' | 'ai', text: string, seconds: number, session = 'call-1') => ({
  _id: `m-${session}-${index}`,
  role,
  text,
  is_voice: true,
  voice_session_id: session,
  voice_turn_index: index,
  created_at: at(seconds),
});

describe('groupVoiceCallThreads', () => {
  test('folds one call into a single expandable voice call message', () => {
    const grouped = groupVoiceCallThreads<ChatListMessage>([
      { _id: 'a', role: 'user', text: 'Typed before the call', created_at: at(0) },
      turn(0, 'ai', 'Hey Saviour.', 10),
      turn(1, 'user', 'I want to talk about my week.', 20),
      turn(2, 'ai', 'How did it go?', 95),
      { _id: 'b', role: 'user', text: 'Typed after the call', created_at: at(120) },
    ]);

    expect(grouped.map((m) => m._id)).toEqual(['a', 'voice-call-call-1', 'b']);
    const call = grouped[1];
    expect(isVoiceCallMessage(call.text, call.is_voice)).toBe(true);
    const parsed = parseVoiceCallMessage(call.text ?? '');
    expect(parsed.duration).toBe('01:25');
    expect(parsed.turns.map((t) => [t.speaker, t.text])).toEqual([
      ['assistant', 'Hey Saviour.'],
      ['user', 'I want to talk about my week.'],
      ['assistant', 'How did it go?'],
    ]);
    expect(call.created_at).toBe(at(10));
  });

  test('orders turns by index and keeps a call together when chat messages interleave', () => {
    const grouped = groupVoiceCallThreads<ChatListMessage>([
      turn(1, 'user', 'second', 20),
      { _id: 'typed', role: 'user', text: 'typed during a minimized call', created_at: at(25) },
      turn(0, 'ai', 'first', 10),
      turn(2, 'ai', 'third', 30),
    ]);

    expect(grouped.map((m) => m._id)).toEqual(['voice-call-call-1', 'typed']);
    expect(parseVoiceCallMessage(grouped[0].text ?? '').turns.map((t) => t.text)).toEqual([
      'first',
      'second',
      'third',
    ]);
  });

  test('keeps separate calls separate and leaves other messages untouched', () => {
    const legacy = {
      _id: 'legacy',
      role: 'ai',
      is_voice: true,
      text: 'Voice call completed (00:30)\n\n--- Transcript ---\nYou: hi',
      created_at: at(0),
    };
    const grouped = groupVoiceCallThreads<ChatListMessage>([
      legacy,
      turn(0, 'ai', 'one', 10, 'call-a'),
      turn(0, 'ai', 'two', 40, 'call-b'),
    ]);

    expect(grouped.map((m) => m._id)).toEqual(['legacy', 'voice-call-call-a', 'voice-call-call-b']);
    expect(grouped[0]).toBe(legacy);
  });

  test('uses the saved call duration when the call has ended', () => {
    const grouped = groupVoiceCallThreads<ChatListMessage>([
      { ...turn(0, 'ai', 'Hey Saviour.', 10), duration: 312 },
      { ...turn(1, 'user', 'Morning walk today.', 20), duration: 312 },
    ]);

    expect(parseVoiceCallMessage(grouped[0].text ?? '').duration).toBe('05:12');
    expect(grouped[0].voice_session_id).toBe('call-1');
  });
});
