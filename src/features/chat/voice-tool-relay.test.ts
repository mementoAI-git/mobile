import { describe, expect, test } from 'bun:test';

import {
  MEMORY_SEARCH_UNAVAILABLE,
  VoiceToolRelay,
  type VoiceToolResponse,
} from './voice-tool-relay';

function relay(search: (query: string) => Promise<string>) {
  const sent: VoiceToolResponse[][] = [];
  const queries: string[] = [];
  const instance = new VoiceToolRelay(
    async (query) => {
      queries.push(query);
      return search(query);
    },
    (responses) => sent.push(responses),
  );
  return { instance, sent, queries };
}

describe('VoiceToolRelay', () => {
  test('answers search_memories with the API result', async () => {
    const { instance, sent, queries } = relay(async () => 'Grandma lived in Ogun.');

    await instance.handle([{ id: 'c1', name: 'search_memories', args: { query: '  grandma  ' } }]);

    expect(queries).toEqual(['grandma']);
    expect(sent).toEqual([
      [{ id: 'c1', name: 'search_memories', response: { result: 'Grandma lived in Ogun.' } }],
    ]);
  });

  test('always responds, even when the search fails or the call is malformed', async () => {
    const { instance, sent } = relay(async () => {
      throw new Error('offline');
    });

    await instance.handle([
      { id: 'a', name: 'search_memories', args: { query: 'x' } },
      { id: 'b', name: 'search_memories', args: {} },
      { id: 'c', name: 'unknown_tool', args: {} },
    ]);

    expect(sent.flat().map((response) => response.response.result).sort()).toEqual(
      [MEMORY_SEARCH_UNAVAILABLE, 'No search query was given.', 'Unknown tool unknown_tool.'].sort(),
    );
  });

  test('drops responses for calls Gemini cancelled', async () => {
    let release!: (value: string) => void;
    const { instance, sent } = relay(
      () =>
        new Promise<string>((resolve) => {
          release = resolve;
        }),
    );

    const pending = instance.handle([{ id: 'c1', name: 'search_memories', args: { query: 'x' } }]);
    instance.cancel(['c1']);
    release('late');
    await pending;

    expect(sent).toEqual([]);
  });

  test('routes other tools to their handlers and survives handler failures', async () => {
    const sent: VoiceToolResponse[][] = [];
    const instance = new VoiceToolRelay(
      async () => 'unused',
      (responses) => sent.push(responses),
      {
        end_call: () => 'Ending.',
        broken: () => {
          throw new Error('boom');
        },
      },
    );

    await instance.handle([
      { id: 'a', name: 'end_call', args: {} },
      { id: 'b', name: 'broken', args: {} },
      { id: 'c', name: 'constructor', args: {} },
    ]);

    // Each result is sent when ready, so compare by call id, not arrival order.
    const byId = sent.flat().sort((x, y) => String(x.id).localeCompare(String(y.id)));
    expect(byId.map((response) => [response.id, response.response.result])).toEqual([
      ['a', 'Ending.'],
      ['b', 'broken failed. Tell the host it did not work.'],
      ['c', 'Unknown tool constructor.'],
    ]);
  });

  test('drops results that finish after the call ended, instead of sending them into a later call', async () => {
    let finish!: (value: string) => void;
    const { instance, sent } = relay(() => new Promise((resolve) => (finish = resolve)));

    const pending = instance.handle([{ id: 'slow', name: 'search_memories', args: { query: 'farm' } }]);
    instance.dispose();
    finish('Grandma had a farm.');
    await pending;

    expect(sent).toEqual([]);
  });

  test('answers a memory search that takes too long as unavailable, so the call is not left waiting', async () => {
    const sent: VoiceToolResponse[][] = [];
    const instance = new VoiceToolRelay(
      () => new Promise<string>(() => {}), // never answers
      (responses) => sent.push(responses),
      {},
      { searchTimeoutMs: 20 },
    );

    await instance.handle([{ id: 'slow', name: 'search_memories', args: { query: 'farm' } }]);

    expect(sent).toEqual([
      [{ id: 'slow', name: 'search_memories', response: { result: MEMORY_SEARCH_UNAVAILABLE } }],
    ]);
  });

  // gemini-3.8-live runs tools asynchronously by default, so a finished
  // result should reach the model without waiting for an unrelated slow one.
  test('sends each result as soon as it is ready, not after the slowest in the batch', async () => {
    let finishSlow!: (value: string) => void;
    const sent: VoiceToolResponse[][] = [];
    const instance = new VoiceToolRelay(
      () => new Promise<string>((resolve) => (finishSlow = resolve)),
      (responses) => sent.push(responses),
      { end_call: () => 'Ending.' },
    );

    const pending = instance.handle([
      { id: 'slow', name: 'search_memories', args: { query: 'farm' } },
      { id: 'fast', name: 'end_call', args: {} },
    ]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(sent.map((batch) => batch.map((response) => response.id))).toEqual([['fast']]);

    finishSlow('Grandma had a farm.');
    await pending;
    expect(sent.map((batch) => batch.map((response) => response.id))).toEqual([['fast'], ['slow']]);
  });
});

describe('VoiceToolRelay invocation', () => {
  test('tells the handler its call id, and when the call no longer matters', async () => {
    const seen: { callId?: string; live: boolean[] }[] = [];
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const instance = new VoiceToolRelay(
      async () => '',
      () => undefined,
      {
        save_story: async (_args, invocation) => {
          const entry = { callId: invocation?.callId, live: [invocation?.isLive() ?? true] };
          seen.push(entry);
          await gate;
          entry.live.push(invocation?.isLive() ?? true);
          return 'Saved.';
        },
      },
    );

    const pending = instance.handle([
      { id: 'a', name: 'save_story', args: {} },
      { id: 'b', name: 'save_story', args: {} },
    ]);
    await Promise.resolve();
    instance.cancel(['a']);
    release();
    await pending;

    expect(seen).toEqual([
      { callId: 'a', live: [true, false] },
      { callId: 'b', live: [true, true] },
    ]);

    let liveAfterHangUp: boolean | undefined;
    const after = new VoiceToolRelay(async () => '', () => undefined, {
      save_story: async (_args, invocation) => {
        after.dispose();
        liveAfterHangUp = invocation?.isLive();
        return 'Saved.';
      },
    });
    await after.handle([{ id: 'c', name: 'save_story', args: {} }]);
    expect(liveAfterHangUp).toBe(false);
  });
});
