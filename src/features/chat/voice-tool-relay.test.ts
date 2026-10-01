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

    expect(sent[0].map((response) => response.response.result)).toEqual([
      MEMORY_SEARCH_UNAVAILABLE,
      'No search query was given.',
      'Unknown tool unknown_tool.',
    ]);
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

    expect(sent[0].map((response) => response.response.result)).toEqual([
      'Ending.',
      'broken failed. Tell the host it did not work.',
      'Unknown tool constructor.',
    ]);
  });
});
