import { describe, expect, test } from 'bun:test';

import { VoiceTurnSync, type VoiceTurnPoster } from './voice-turn-sync';

const turn = (user: string, ai: string) => ({
  messages: [
    { role: 'user' as const, text: user, is_voice: true as const },
    { role: 'ai' as const, text: ai, is_voice: true as const },
  ],
});

function recorder(responses: Array<unknown | Error> = []) {
  const calls: Array<{ url: string; body: any }> = [];
  const post: VoiceTurnPoster = async (url, body) => {
    calls.push({ url, body: JSON.parse(JSON.stringify(body)) });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    // Like the real API, echo the memory the client sent, or create one.
    return next ?? { data: { memory_id: body.memory_id ?? 'm1' } };
  };
  return { calls, post };
}

describe('VoiceTurnSync', () => {
  test('assigns increasing indexes across turns and skips blank text', async () => {
    const { calls, post } = recorder();
    const sync = new VoiceTurnSync(post, '/ai/voice/turns', 's1');

    sync.addTurns([turn('hi', 'hey'), turn('  ', 'still here')]);
    await sync.flush();

    expect(calls).toHaveLength(1);
    expect(calls[0].body.turns.map((t: any) => [t.index, t.role, t.text])).toEqual([
      [0, 'user', 'hi'],
      [1, 'ai', 'hey'],
      [2, 'ai', 'still here'],
    ]);
  });

  test('sends batches in order without duplicating turns', async () => {
    const { calls, post } = recorder();
    const sync = new VoiceTurnSync(post, '/ai/voice/turns', 's1');

    sync.addTurns([turn('a', 'b')]);
    sync.addTurns([turn('c', 'd')]);
    await sync.flush();

    const indexes = calls.flatMap((c) => c.body.turns.map((t: any) => t.index));
    expect(indexes).toEqual([0, 1, 2, 3]);
  });

  test('keeps turns after a failure and retries them on the next flush', async () => {
    // addTurns flushes immediately, so fail that attempt and the explicit one.
    const { calls, post } = recorder([new Error('offline'), new Error('offline')]);
    const sync = new VoiceTurnSync(post, '/ai/voice/turns', 's1');

    sync.addTurns([turn('a', 'b')]);
    expect(await sync.flush()).toBe(false);
    expect(sync.hasPending()).toBe(true);

    expect(await sync.flush()).toBe(true);
    expect(sync.hasPending()).toBe(false);
    expect(calls.at(-1)?.body.turns.map((t: any) => t.index)).toEqual([0, 1]);
  });

  test('adopts the memory id returned by the server for later batches', async () => {
    const { calls, post } = recorder([{ data: { memory_id: 'created' } }]);
    const sync = new VoiceTurnSync(post, '/ai/voice/turns', 's1');

    sync.addTurns([turn('a', 'b')]);
    await sync.flush();
    sync.addTurns([turn('c', 'd')]);
    await sync.flush();

    expect(calls[0].body.memory_id).toBeUndefined();
    expect(calls.at(-1)?.body.memory_id).toBe('created');
    expect(sync.getMemoryId()).toBe('created');
  });

  test('marks only the last AI message as interrupted', async () => {
    const { calls, post } = recorder();
    const sync = new VoiceTurnSync(post, '/ai/voice/turns', 's1', 'm0');

    sync.addTurns([turn('a', 'b'), turn('c', 'd')], { interruptedLast: true });
    await sync.flush();

    expect(calls[0].body.memory_id).toBe('m0');
    expect(calls[0].body.turns.filter((t: any) => t.interrupted).map((t: any) => t.text)).toEqual(['d']);
  });

  test('reports every change to its unacknowledged turns, for the on-device outbox', async () => {
    const { post } = recorder([new Error('offline')]);
    const snapshots: Array<{ turns: number[]; memoryId?: string }> = [];
    const sync = new VoiceTurnSync(post, '/ai/voice/turns', 's1', undefined, (pending, memoryId) =>
      snapshots.push({ turns: pending.map((t) => t.index), memoryId }),
    );

    sync.addTurns([turn('hi', 'hey')]);
    await sync.flush(); // fails: still pending
    await sync.flush(); // succeeds: acknowledged

    expect(snapshots[0]).toEqual({ turns: [0, 1], memoryId: undefined });
    expect(snapshots.at(-1)).toEqual({ turns: [], memoryId: 'm1' });
  });
});
