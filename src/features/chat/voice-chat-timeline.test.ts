import { describe, expect, test } from 'bun:test';
import { buildVoiceChatTimeline, type VoiceChatSession } from './voice-chat-timeline';
import type { ChatListMessage } from './message-list';
const at = (seconds: number) => new Date(Date.UTC(2026, 9, 18, 9, 0, seconds)).toISOString();
const turn = (index: number, role = 'ai', session = 'call-a'): ChatListMessage => ({
  _id: `${session}-${index}`, role, text: `Turn ${index}`, is_voice: true,
  voice_session_id: session, voice_turn_index: index, created_at: at(10 + index),
});
const session = (ended = false): VoiceChatSession => ({
  id: 'call-a', memoryId: 'memory-a', startedAt: at(9),
  ...(ended ? { endedAt: at(20) } : {}),
  messages: [turn(0), turn(1, 'user')],
});

describe('web-style voice chat timeline', () => {
  test('keeps saved turns inline between one start and one end divider', () => {
    const before = { _id: 'before', role: 'user', text: 'Typed before', created_at: at(0) };
    const after = { _id: 'after', role: 'user', text: 'Typed after', created_at: at(40) };
    const rows = buildVoiceChatTimeline([before, turn(0), turn(1, 'user'), after]);
    expect(rows.map(row => row.voice_boundary ?? row._id)).toEqual(['before', 'started', 'call-a-0', 'call-a-1', 'ended', 'after']);
    expect(rows[2].role).toBe('ai');
    expect(rows[3].role).toBe('user');
  });
  test('shows a start divider immediately, even before anyone has spoken', () => {
    const live = { ...session(), messages: [] };
    expect(buildVoiceChatTimeline([], live).map(row => row.voice_boundary)).toEqual(['started']);
  });
  test('does not show an end divider until the live session has ended', () => {
    expect(buildVoiceChatTimeline([], session()).map(row => row.voice_boundary).filter(Boolean)).toEqual(['started']);
    expect(buildVoiceChatTimeline([], session(true)).map(row => row.voice_boundary).filter(Boolean)).toEqual(['started', 'ended']);
  });
  test('deduplicates live and saved turns by session and turn index', () => {
    const saved = { ...turn(0), _id: 'server-id', text: 'Canonical saved turn' };
    const rows = buildVoiceChatTimeline([saved], session());
    expect(rows.filter(row => !row.voice_boundary)).toHaveLength(2);
    expect(rows[1]).toMatchObject({ _id: 'server-id', text: 'Canonical saved turn' });
  });
  test('keeps typed messages during a call in chronological order', () => {
    const typed = { _id: 'typed', role: 'user', text: 'Typed during voice', created_at: at(10.5) };
    const rows = buildVoiceChatTimeline([turn(0), typed, turn(1)]);
    expect(rows.map(row => row.voice_boundary ?? row._id)).toEqual(['started', 'call-a-0', 'typed', 'call-a-1', 'ended']);
  });
  test('expands legacy transcripts without an expandable call card', () => {
    const rows = buildVoiceChatTimeline([{ _id: 'legacy', role: 'ai', is_voice: true, text: 'Voice call completed (00:35)\n\n--- Transcript ---\nYou: Hello\nMemento: Hi there', created_at: at(0) }]);
    expect(rows.map(row => row.voice_boundary ?? row.text)).toEqual(['started', 'Hello', 'Hi there', 'ended']);
    expect(rows[1].role).toBe('user');
  });
  test('keeps empty historical calls visible as a start and end divider', () => {
    const rows = buildVoiceChatTimeline([{ _id: 'legacy', role: 'ai', text: 'Voice call completed (00:35)', created_at: at(0) }]);
    expect(rows.map(row => row.voice_boundary)).toEqual(['started', 'ended']);
  });
  test('does not duplicate a legacy record when saved turns exist for its session', () => {
    const legacy = { ...turn(0), _id: 'aggregate', text: 'Voice call completed (00:35)\n\n--- Transcript ---\nMemento: Turn 0' };
    expect(buildVoiceChatTimeline([legacy, turn(0)]).filter(row => !row.voice_boundary)).toHaveLength(1);
  });
  test('uses separate stable divider identities for each call', () => {
    const rows = buildVoiceChatTimeline([turn(0), { ...turn(0, 'ai', 'call-b'), created_at: at(40) }]);
    expect(rows.filter(row => row.voice_boundary).map(row => row.voice_session_id)).toEqual(['call-a','call-a','call-b','call-b']);
    expect(new Set(rows.map(row => row._id)).size).toBe(rows.length);
  });
  test('leaves normal chat and dictated messages outside voice-session dividers', () => {
    const dictated = { _id: 'dictated', role: 'user', text: 'A dictated message', is_voice: true };
    expect(buildVoiceChatTimeline([dictated])).toEqual([dictated]);
  });
});
