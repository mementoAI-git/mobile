import { describe, expect, test } from 'bun:test';

import {
  VOICE_OUTBOX_MAX_AGE_MS,
  VoiceCallOutbox,
  type VoiceOutboxPoster,
} from './voice-call-outbox';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (key: string) => data.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: async (key: string) => {
      data.delete(key);
    },
  };
}

type Call = { url: string; body: any };

function poster(failOn: (call: Call, n: number) => boolean = () => false) {
  const calls: Call[] = [];
  const post: VoiceOutboxPoster = async (url, body) => {
    const call = { url, body };
    calls.push(call);
    if (failOn(call, calls.length)) throw new Error('offline');
    return { data: { memory_id: 'memory-1' } };
  };
  return { calls, post };
}

const turn = (index: number, text = `line ${index}`) => ({ index, role: 'user' as const, text });

function outbox(storage = memoryStorage(), now = () => 1_000_000) {
  return new VoiceCallOutbox(storage, 'user-a', {
    turnsUrl: '/ai/voice/turns',
    endUrl: (sessionId) => `/ai/voice/calls/${sessionId}/end`,
    now,
  });
}

describe('VoiceCallOutbox', () => {
  test('sends saved turns, then the call end, then forgets the call', async () => {
    const box = outbox();
    await box.saveTurns('call-1', undefined, [turn(0), turn(1)]);
    await box.markEnded('call-1', 42);
    const { calls, post } = poster();

    expect(await box.drain(post)).toBe(true);

    expect(calls).toEqual([
      { url: '/ai/voice/turns', body: { session_id: 'call-1', turns: [turn(0), turn(1)] } },
      { url: '/ai/voice/calls/call-1/end', body: { duration_seconds: 42, memory_id: 'memory-1' } },
    ]);
    expect(await box.list()).toEqual([]);
  });

  test('keeps unsent turns across a failure and resumes with the conversation it learned', async () => {
    const storage = memoryStorage();
    const turns = Array.from({ length: 60 }, (_, index) => turn(index));
    await outbox(storage).saveTurns('call-1', undefined, turns);
    await outbox(storage).markEnded('call-1', 10);

    // First batch of 50 saves, the second fails: the network dropped.
    const first = poster((_, n) => n === 2);
    expect(await outbox(storage).drain(first.post)).toBe(false);

    // Survives a restart: a new instance on the same storage resumes.
    const second = poster();
    expect(await outbox(storage).drain(second.post)).toBe(true);
    expect(second.calls[0]).toEqual({
      url: '/ai/voice/turns',
      body: { session_id: 'call-1', memory_id: 'memory-1', turns: turns.slice(50) },
    });
    expect(second.calls[1].url).toBe('/ai/voice/calls/call-1/end');
  });

  // The end request starts server-side transcript clean-up, so it must never
  // run on a partial transcript.
  test('never records the call end before every turn is saved', async () => {
    const box = outbox();
    await box.saveTurns('call-1', undefined, [turn(0)]);
    await box.markEnded('call-1', 5);
    const { calls, post } = poster((call) => call.url === '/ai/voice/turns');

    expect(await box.drain(post)).toBe(false);

    expect(calls.map((call) => call.url)).toEqual(['/ai/voice/turns']);
    expect(await box.list()).toHaveLength(1);
  });

  test('leaves a call that has not ended alone until it ends, unless asked to skip it', async () => {
    const box = outbox();
    await box.saveTurns('live-call', undefined, [turn(0)]);
    const { calls, post } = poster();

    expect(await box.drain(post, { skipSessionId: 'live-call' })).toBe(true);
    expect(calls).toEqual([]);

    // A call left unfinished by an app crash is still sent, without an end.
    expect(await box.drain(post)).toBe(true);
    expect(calls.map((call) => call.url)).toEqual(['/ai/voice/turns']);
  });

  test("replaces a call's pending turns with the latest snapshot", async () => {
    const box = outbox();
    await box.saveTurns('call-1', undefined, [turn(0)]);
    await box.saveTurns('call-1', 'memory-9', [turn(0), turn(1)]);

    expect(await box.list()).toEqual([
      expect.objectContaining({ sessionId: 'call-1', memoryId: 'memory-9', turns: [turn(0), turn(1)] }),
    ]);
  });

  test('keeps each account separate', async () => {
    const storage = memoryStorage();
    await outbox(storage).saveTurns('call-1', undefined, [turn(0)]);
    const other = new VoiceCallOutbox(storage, 'user-b', {
      turnsUrl: '/ai/voice/turns',
      endUrl: (sessionId) => `/ai/voice/calls/${sessionId}/end`,
    });

    expect(await other.list()).toEqual([]);
    expect(await outbox(storage).list()).toHaveLength(1);
  });

  test('drops calls older than the retention window without sending them', async () => {
    const storage = memoryStorage();
    await outbox(storage, () => 0).saveTurns('old-call', undefined, [turn(0)]);
    const { calls, post } = poster();

    await outbox(storage, () => VOICE_OUTBOX_MAX_AGE_MS + 1).drain(post);

    expect(calls).toEqual([]);
    expect(await outbox(storage).list()).toEqual([]);
  });

  test('forget removes a call once it was fully saved during the call', async () => {
    const box = outbox();
    await box.saveTurns('call-1', undefined, [turn(0)]);
    await box.forget('call-1');
    expect(await box.list()).toEqual([]);
  });

  test('a drain asked for while another runs still gets its own pass, so a just-ended call is sent', async () => {
    const box = outbox();
    await box.saveTurns('older', undefined, [turn(0)]);
    await box.saveTurns('just-ended', undefined, [turn(0)]);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const sent: string[] = [];
    const post: VoiceOutboxPoster = async (_url, body) => {
      if (body.session_id === 'older') await gate;
      if (typeof body.session_id === 'string') sent.push(body.session_id);
      return { data: { memory_id: 'memory-1' } };
    };

    // Background drain started during the call, skipping it.
    const background = box.drain(post, { skipSessionId: 'just-ended' });
    await box.markEnded('just-ended', 3);
    const atHangUp = box.drain(post);
    release();
    await Promise.all([background, atHangUp]);

    expect(sent).toContain('just-ended');
    expect(await box.list()).toEqual([]);
  });
});
