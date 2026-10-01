import { describe, expect, test } from 'bun:test';

import {
  buildVoiceCallEndBody,
  parseVoiceCallSummary,
  voiceCallEndPath,
  voiceCallSummaryPath,
} from './voice-call-records';

describe('voice call records', () => {
  test('builds per-call API paths', () => {
    expect(voiceCallEndPath('1759-abc')).toBe('/ai/voice/calls/1759-abc/end');
    expect(voiceCallSummaryPath('a b')).toBe('/ai/voice/calls/a%20b/summary');
  });

  test('sends whole seconds and the memory when known', () => {
    expect(buildVoiceCallEndBody(125.6, 'm1')).toEqual({ duration_seconds: 126, memory_id: 'm1' });
    expect(buildVoiceCallEndBody(-3)).toEqual({ duration_seconds: 0 });
    expect(buildVoiceCallEndBody(Number.NaN)).toEqual({ duration_seconds: 0 });
  });

  test('reads the summary and its key points', () => {
    expect(
      parseVoiceCallSummary({
        summary: { text: ' You talked about the farm. ', key_points: ['Goats', ' ', 7, 'Mango tree'] },
      }),
    ).toEqual({ text: 'You talked about the farm.', keyPoints: ['Goats', 'Mango tree'] });
    expect(parseVoiceCallSummary({ summary: { text: 'Short call.' } })).toEqual({
      text: 'Short call.',
      keyPoints: [],
    });
  });

  test('rejects an empty or malformed summary', () => {
    expect(parseVoiceCallSummary(undefined)).toBeNull();
    expect(parseVoiceCallSummary({})).toBeNull();
    expect(parseVoiceCallSummary({ summary: { text: '  ' } })).toBeNull();
  });
});
