import { describe, expect, test } from 'bun:test';
import { buildEphemeralTokenUrl } from './voice-token-url';
import { callLimitSchedule, isCallTimeUp, parseVoiceCallTime } from './voice-call-limit';

describe('voice call time limit', () => {
  test('reads the ticket and time left from the token response', () => {
    expect(parseVoiceCallTime({ call_ticket: 't1', call_seconds_left: 1800 })).toEqual({ ticket: 't1', secondsLeft: 1800 });
    // No limit on the server: nothing to schedule.
    expect(parseVoiceCallTime({ token: 'x' })).toBeUndefined();
    expect(parseVoiceCallTime({ call_ticket: 't1', call_seconds_left: 0 })).toBeUndefined();
  });

  test('warns two minutes before the end, and skips the warning when there is no time for it', () => {
    expect(callLimitSchedule(1800)).toEqual({ warnInMs: 1_680_000, endInMs: 1_800_000 });
    expect(callLimitSchedule(90)).toEqual({ warnInMs: null, endInMs: 90_000 });
  });

  test('sends the ticket back when reconnecting', () => {
    const url = buildEphemeralTokenUrl('/ai/ephemeral-token', { resumeHandle: 'r1', callTicket: 't1', timeZone: null });
    expect(new URLSearchParams(url.split('?')[1]).get('call_ticket')).toBe('t1');
  });

  test('recognises a reconnect refused because the time is up', () => {
    expect(isCallTimeUp({ httpStatus: 403, details: { reason: 'voice_call_limit' } })).toBe(true);
    expect(isCallTimeUp({ httpStatus: 403, details: { reason: 'subscription_required' } })).toBe(false);
    expect(isCallTimeUp({ httpStatus: 503 })).toBe(false);
  });
});
