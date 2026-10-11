import { describe, expect, test } from 'bun:test';

import {
  nextReconnectDelay,
  VOICE_RECONNECT_BUDGET_MS,
  VOICE_RECONNECT_DELAYS_MS,
  VoiceTransports,
  withDeadline,
} from './voice-connection';

describe('withDeadline', () => {
  test('passes through a result that arrives in time', async () => {
    await expect(withDeadline(Promise.resolve('ready'), 50, 'too slow')).resolves.toBe('ready');
  });

  test('rejects with the given message when the deadline passes first', async () => {
    const never = new Promise<string>(() => {});
    await expect(withDeadline(never, 10, 'Voice session setup timed out.')).rejects.toThrow(
      'Voice session setup timed out.',
    );
  });

  test('keeps the original rejection when it comes first', async () => {
    await expect(withDeadline(Promise.reject(new Error('closed')), 50, 'too slow')).rejects.toThrow(
      'closed',
    );
  });
});

describe('nextReconnectDelay', () => {
  test('follows the backoff schedule while the budget lasts', () => {
    expect(VOICE_RECONNECT_DELAYS_MS.map((_, attempt) => nextReconnectDelay(attempt, 0))).toEqual(
      VOICE_RECONNECT_DELAYS_MS,
    );
  });

  test('stops after the last attempt', () => {
    expect(nextReconnectDelay(VOICE_RECONNECT_DELAYS_MS.length, 0)).toBeNull();
  });

  // Each attempt can take a token request plus a setup wait, so the schedule
  // alone does not bound recovery: the elapsed time does.
  test('stops once waiting would run past the overall budget', () => {
    expect(nextReconnectDelay(1, VOICE_RECONNECT_BUDGET_MS - 100)).toBeNull();
    expect(nextReconnectDelay(0, VOICE_RECONNECT_BUDGET_MS)).toBeNull();
  });
});

describe('VoiceTransports', () => {
  test('only the active socket may deliver call events', () => {
    const transports = new VoiceTransports();
    const first = transports.begin();
    transports.activate(first);
    expect(transports.isActive(first)).toBe(true);

    // A reconnect opens a replacement while the first is still in use.
    const second = transports.begin();
    expect(transports.isActive(second)).toBe(false);
    expect(transports.isActive(first)).toBe(true);

    transports.activate(second);
    expect(transports.isActive(first)).toBe(false);
    expect(transports.isActive(second)).toBe(true);
  });

  test('reset leaves no socket active, for a new call', () => {
    const transports = new VoiceTransports();
    const id = transports.begin();
    transports.activate(id);
    transports.reset();
    expect(transports.isActive(id)).toBe(false);
  });
});
