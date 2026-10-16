import { describe, expect, test } from 'bun:test';

import {
  VOICE_WARM_START_MAX_AGE_MS,
  VoiceMessageBuffer,
  VoiceWarmStart,
  type WarmCall,
} from './voice-warm-start';

class FakeSession {
  closed = 0;
  close() {
    this.closed += 1;
  }
}

function setup() {
  const clock = { now: 0 };
  const warm = new VoiceWarmStart<FakeSession, string, string>(() => clock.now);
  const call = (key: string, session = new FakeSession()): WarmCall<FakeSession, string, string> => ({
    key,
    startedAt: clock.now,
    session,
    transport: 7,
    liveToken: `token-${key}`,
    buffer: new VoiceMessageBuffer<string>(),
  });
  return { clock, warm, call };
}

describe('VoiceMessageBuffer', () => {
  test('holds messages until released, then replays them in order and passes later ones straight on', () => {
    const buffer = new VoiceMessageBuffer<string>();
    buffer.push('setup');
    buffer.push('audio-1');
    buffer.push('audio-2');
    expect(buffer.size).toBe(3);

    const seen: string[] = [];
    expect(buffer.release((message) => seen.push(message))).toBe(3);
    buffer.push('audio-3');

    expect(seen).toEqual(['setup', 'audio-1', 'audio-2', 'audio-3']);
    expect(buffer.size).toBe(0);
  });

  test('keeps only the newest messages when a session floods it', () => {
    const buffer = new VoiceMessageBuffer<number>();
    for (let i = 0; i < 2_005; i += 1) buffer.push(i);
    const seen: number[] = [];
    buffer.release((message) => seen.push(message));
    expect(seen.length).toBe(2_000);
    expect(seen[0]).toBe(5);
  });
});

describe('VoiceWarmStart', () => {
  test('hands the prepared call to the call it was made for, once', () => {
    const { warm, call } = setup();
    const prepared = call('story-1|Fenrir');
    warm.hold(prepared);

    expect(warm.isHeldFor('story-1|Fenrir')).toBe(true);
    expect(warm.take('story-1|Fenrir')?.liveToken).toBe('token-story-1|Fenrir');
    expect(warm.take('story-1|Fenrir')).toBeUndefined();
    expect(prepared.session.closed).toBe(0);
  });

  test('closes a prepared call for another conversation or voice instead of using it', () => {
    const { warm, call } = setup();
    const prepared = call('story-1|Fenrir');
    warm.hold(prepared);

    expect(warm.take('story-2|Fenrir')).toBeUndefined();
    expect(prepared.session.closed).toBe(1);
  });

  test('closes a prepared call that has gone stale', () => {
    const { clock, warm, call } = setup();
    const prepared = call('k');
    warm.hold(prepared);
    clock.now = VOICE_WARM_START_MAX_AGE_MS + 1;

    expect(warm.isHeldFor('k')).toBe(false);
    expect(warm.take('k')).toBeUndefined();
    expect(prepared.session.closed).toBe(1);
  });

  test('does not use a session that closed by itself, even if it closed before it was held', () => {
    const { warm, call } = setup();
    const early = call('k');
    warm.markClosed(early.session);
    warm.hold(early);
    expect(warm.take('k')).toBeUndefined();

    const later = call('k');
    warm.hold(later);
    warm.markClosed(later.session);
    expect(warm.take('k')).toBeUndefined();
  });

  test('holding a new call closes the previous one, and discard closes what is held', () => {
    const { warm, call } = setup();
    const first = call('a');
    const second = call('b');
    warm.hold(first);
    warm.hold(second);
    expect(first.session.closed).toBe(1);

    warm.discard();
    expect(second.session.closed).toBe(1);
    expect(warm.take('b')).toBeUndefined();
  });
});
