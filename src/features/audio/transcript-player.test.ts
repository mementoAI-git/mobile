import { describe, expect, test } from 'bun:test';
import {
  clampSkip,
  computeTimelineBlocks,
  findActiveIndex,
  formatClock,
  formatRemaining,
  fractionFromX,
  hasSpeakers,
  isVoiceRecording,
  mergeTranscriptTurns,
  parseFileTranscription,
  resolveTimelineDuration,
  speakerLabel,
  spokenCharCount,
  transparentColor,
  type TranscriptSegment,
} from './transcript-player';

const conversation: TranscriptSegment[] = [
  { start: 0, end: 4, text: 'Hi there.', speaker: 'ai' },
  { start: 4, end: 7, text: 'How are you?', speaker: 'ai' },
  { start: 7.5, end: 12, text: 'Good, thanks.', speaker: 'user' },
  { start: 12, end: 20, text: 'Tell me about your day.', speaker: 'ai' },
];

describe('parseFileTranscription', () => {
  test('keeps valid segments, sorts them and drops junk', () => {
    const parsed = parseFileTranscription({
      full_text: ' Hello world ',
      segments: [
        { start: 5, end: 8, text: 'world', speaker: 'user' },
        { start: '1', end: '4', text: ' Hello ' },
        { start: 9, end: 10, text: '   ' },
        { start: null, end: 3, text: 'no start' },
        { start: 11, end: 9, text: 'end before start', speaker: 'robot' },
        null,
      ],
    });
    expect(parsed?.fullText).toBe('Hello world');
    expect(parsed?.segments).toEqual([
      { start: 1, end: 4, text: 'Hello' },
      { start: 5, end: 8, text: 'world', speaker: 'user' },
      { start: 11, end: 11, text: 'end before start' },
    ]);
  });

  test('returns null for empty or invalid payloads', () => {
    expect(parseFileTranscription(null)).toBeNull();
    expect(parseFileTranscription('text')).toBeNull();
    expect(parseFileTranscription({ full_text: '', segments: [] })).toBeNull();
  });
});

describe('findActiveIndex', () => {
  test('finds the last segment that has started', () => {
    expect(findActiveIndex(conversation, 0)).toBe(0);
    expect(findActiveIndex(conversation, 3.9)).toBe(0);
    expect(findActiveIndex(conversation, 4)).toBe(1);
    expect(findActiveIndex(conversation, 7.2)).toBe(1); // gap keeps the previous segment
    expect(findActiveIndex(conversation, 7.5)).toBe(2);
    expect(findActiveIndex(conversation, 999)).toBe(3);
  });

  test('returns -1 before the first segment or with no segments', () => {
    expect(findActiveIndex([{ start: 2 }], 1)).toBe(-1);
    expect(findActiveIndex([], 10)).toBe(-1);
    expect(findActiveIndex(conversation, Number.NaN)).toBe(-1);
  });

  test('agrees with a linear scan on a large list', () => {
    const items = Array.from({ length: 500 }, (_, i) => ({ start: i * 1.5 }));
    for (const t of [0, 0.7, 1.5, 100.2, 748.5, 1000]) {
      let expected = -1;
      items.forEach((item, i) => { if (item.start <= t) expected = i; });
      expect(findActiveIndex(items, t)).toBe(expected);
    }
  });
});

describe('mergeTranscriptTurns', () => {
  test('merges consecutive segments of the same speaker', () => {
    const turns = mergeTranscriptTurns(conversation);
    expect(turns.map((t) => [t.speaker, t.start, t.end, t.text])).toEqual([
      ['ai', 0, 7, 'Hi there. How are you?'],
      ['user', 7.5, 12, 'Good, thanks.'],
      ['ai', 12, 20, 'Tell me about your day.'],
    ]);
    expect(new Set(turns.map((t) => t.id)).size).toBe(3);
  });

  test('keeps speakerless voice-note segments separate', () => {
    const turns = mergeTranscriptTurns([
      { start: 0, end: 3, text: 'One.' },
      { start: 3, end: 6, text: 'Two.' },
    ]);
    expect(turns).toHaveLength(2);
    expect(turns[1].speaker).toBeUndefined();
  });

  test('handles an empty list', () => {
    expect(mergeTranscriptTurns([])).toEqual([]);
  });
});

describe('computeTimelineBlocks', () => {
  test('maps segments to track fractions', () => {
    const blocks = computeTimelineBlocks(conversation, 20);
    expect(blocks).toHaveLength(4);
    expect(blocks[0]).toEqual({ key: 'block-0', left: 0, width: 0.2, speaker: 'ai' });
    expect(blocks[2].left).toBeCloseTo(0.375);
    expect(blocks[2].width).toBeCloseTo(0.225);
  });

  test('clamps blocks that run past the duration and drops empty ones', () => {
    const blocks = computeTimelineBlocks(
      [
        { start: 8, end: 14, text: 'overrun' },
        { start: 12, end: 15, text: 'after the end' },
        { start: 3, end: 3, text: 'zero width' },
      ],
      10,
    );
    expect(blocks).toHaveLength(1);
    expect(blocks[0].left).toBeCloseTo(0.8);
    expect(blocks[0].width).toBeCloseTo(0.2);
  });

  test('returns nothing without a duration', () => {
    expect(computeTimelineBlocks(conversation, 0)).toEqual([]);
    expect(computeTimelineBlocks(conversation, Number.NaN)).toEqual([]);
  });

  test('falls back to the transcript end for the layout duration', () => {
    expect(resolveTimelineDuration(42, conversation)).toBe(42);
    expect(resolveTimelineDuration(0, conversation)).toBe(20);
    expect(resolveTimelineDuration(0, [])).toBe(0);
  });
});

describe('time formatting', () => {
  test('formats elapsed time as mm:ss', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(111.9)).toBe('01:51');
    expect(formatClock(599)).toBe('09:59');
    expect(formatClock(3725)).toBe('1:02:05');
    expect(formatClock(-4)).toBe('00:00');
    expect(formatClock(Number.NaN)).toBe('00:00');
  });

  test('formats remaining time as -mm:ss', () => {
    expect(formatRemaining(111, 314)).toBe('-03:23');
    expect(formatRemaining(0, 65.6)).toBe('-01:05');
    expect(formatRemaining(400, 314)).toBe('-00:00');
    expect(formatRemaining(10, 0)).toBe('-00:00');
  });
});

describe('seeking', () => {
  test('clamps skips to the file', () => {
    expect(clampSkip(10, 5, 60)).toBe(15);
    expect(clampSkip(58, 5, 60)).toBe(60);
    expect(clampSkip(3, -5, 60)).toBe(0);
    expect(clampSkip(30, 5, 0)).toBe(35);
    expect(clampSkip(Number.NaN, -5, 60)).toBe(0);
  });

  test('converts touch positions to track fractions', () => {
    expect(fractionFromX(50, 200)).toBe(0.25);
    expect(fractionFromX(-10, 200)).toBe(0);
    expect(fractionFromX(260, 200)).toBe(1);
    expect(fractionFromX(10, 0)).toBe(0);
  });
});

describe('labels and eligibility', () => {
  test('names speakers', () => {
    expect(speakerLabel('user')).toBe('You');
    expect(speakerLabel('ai')).toBe('Memento');
    expect(speakerLabel()).toBeNull();
    expect(hasSpeakers(conversation)).toBe(true);
    expect(hasSpeakers([{ start: 0, end: 1, text: 'a' }])).toBe(false);
  });

  test('treats voice notes and voice_*.m4a files as transcribable', () => {
    expect(isVoiceRecording({ isVoice: true, name: 'anything.mp3' })).toBe(true);
    expect(isVoiceRecording({ name: 'voice_1730000000000.m4a' })).toBe(true);
    expect(isVoiceRecording({ name: 'VOICE_call.M4A' })).toBe(true);
    expect(isVoiceRecording({ name: 'my-song.mp3' })).toBe(false);
    expect(isVoiceRecording({ name: 'voice_memo.mp3' })).toBe(false);
    expect(isVoiceRecording({})).toBe(false);
  });
});

describe('spokenCharCount', () => {
  const [firstTurn] = mergeTranscriptTurns(conversation); // 'Hi there. How are you?' over 0–7s

  test('reveals nothing before the turn and everything after it', () => {
    expect(spokenCharCount(firstTurn, -1)).toBe(0);
    expect(spokenCharCount(firstTurn, 7)).toBe(firstTurn.text.length);
    expect(spokenCharCount(firstTurn, 30)).toBe(firstTurn.text.length);
  });

  test('streams whole words through the active segment', () => {
    expect(firstTurn.text.slice(0, spokenCharCount(firstTurn, 0))).toBe('');
    expect(firstTurn.text.slice(0, spokenCharCount(firstTurn, 2))).toBe('Hi');
    expect(firstTurn.text.slice(0, spokenCharCount(firstTurn, 4))).toBe('Hi there. ');
    expect(firstTurn.text.slice(0, spokenCharCount(firstTurn, 5.5))).toBe('Hi there. How');
  });
});

describe('transparentColor', () => {
  test('keeps the hue and drops the alpha', () => {
    expect(transparentColor('#EFEDEA')).toBe('rgba(239,237,234,0)');
    expect(transparentColor('#fff')).toBe('rgba(255,255,255,0)');
    expect(transparentColor('rgba(23, 11, 0, 0.9)')).toBe('rgba(23,11,0,0)');
    expect(transparentColor('hotpink')).toBe('transparent');
  });
});
