import { describe, expect, test } from 'bun:test';

import {
  SERVER_TOOL_UNAVAILABLE,
  createServerToolHandlers,
  parseVoiceToolEffects,
  type VoiceToolEffect,
} from './voice-server-tools';

function setup(respond: (name: string, args: Record<string, unknown>) => Promise<unknown>) {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  const applied: VoiceToolEffect[] = [];
  const handlers = createServerToolHandlers(['update_profile', 'open_story'], {
    run: (name, args) => {
      calls.push({ name, args });
      return respond(name, args);
    },
    applyEffects: (effects) => applied.push(...effects),
    timeoutMs: 50,
  });
  return { calls, applied, handlers };
}

describe('createServerToolHandlers', () => {
  test('forwards the call with its arguments and returns the server text to Gemini', async () => {
    const { calls, handlers } = setup(async () => ({
      data: { result: 'Done: changed their nickname to Yo.', effects: [] },
    }));

    const result = await handlers.update_profile({ nickname: 'Yo' });

    expect(calls).toEqual([{ name: 'update_profile', args: { nickname: 'Yo' } }]);
    expect(result).toBe('Done: changed their nickname to Yo.');
  });

  test('applies the effects the server asks for', async () => {
    const { applied, handlers } = setup(async () => ({
      data: {
        result: 'Done.',
        effects: [
          { type: 'refresh', what: 'profile' },
          { type: 'open', destination: 'profile' },
        ],
      },
    }));

    await handlers.update_profile({ nickname: 'Yo' });

    expect(applied).toEqual([
      { type: 'refresh', what: 'profile' },
      { type: 'open', destination: 'profile' },
    ]);
  });

  test('tells Gemini the action failed when the server does, so it does not claim success', async () => {
    const { applied, handlers } = setup(async () => {
      throw new Error('500');
    });

    expect(await handlers.update_profile({ nickname: 'Yo' })).toBe(SERVER_TOOL_UNAVAILABLE);
    expect(applied).toEqual([]);
  });

  test('answers within the deadline when the server is slow', async () => {
    const { handlers } = setup(() => new Promise(() => undefined));

    expect(await handlers.open_story({ query: 'Lagos' })).toBe(SERVER_TOOL_UNAVAILABLE);
  });

  test('only creates handlers for the tools the token lists', () => {
    const { handlers } = setup(async () => ({}));
    expect(Object.keys(handlers).sort()).toEqual(['open_story', 'update_profile']);
  });
});

describe('parseVoiceToolEffects', () => {
  test('keeps only effects this build knows how to apply', () => {
    expect(
      parseVoiceToolEffects([
        { type: 'refresh', what: 'profile' },
        { type: 'refresh', what: 'capsules' },
        { type: 'refresh', what: 'everything' },
        { type: 'open', destination: 'profile' },
        { type: 'open', destination: 'not-a-screen' },
        { type: 'open_story', id: '64b7f0c2a1b2c3d4e5f60718' },
        { type: 'open_story', id: '../../settings' },
        { type: 'delete_everything' },
        'nonsense',
      ]),
    ).toEqual([
      { type: 'refresh', what: 'profile' },
      { type: 'refresh', what: 'capsules' },
      { type: 'open', destination: 'profile' },
      { type: 'open_story', id: '64b7f0c2a1b2c3d4e5f60718' },
    ]);
  });

  test('handles a missing or malformed list', () => {
    expect(parseVoiceToolEffects(undefined)).toEqual([]);
    expect(parseVoiceToolEffects({})).toEqual([]);
  });
});
