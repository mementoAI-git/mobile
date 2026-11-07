import { describe, expect, test } from 'bun:test';

import {
  SERVER_TOOL_UNCERTAIN,
  SERVER_TOOL_UNAVAILABLE,
  createServerToolHandlers,
  parseVoiceToolEffects,
  type VoiceToolEffect,
} from './voice-server-tools';

const live = { callId: 'fc-1', isLive: () => true };

function setup(respond: (name: string, args: Record<string, unknown>) => Promise<unknown>) {
  const calls: { name: string; args: Record<string, unknown>; callId?: string }[] = [];
  const applied: VoiceToolEffect[] = [];
  const handlers = createServerToolHandlers(['update_profile', 'open_story'], {
    run: (name, args, invocation) => {
      calls.push({ name, args, ...(invocation.callId && { callId: invocation.callId }) });
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

    const result = await handlers.update_profile({ nickname: 'Yo' }, live);

    expect(calls).toEqual([{ name: 'update_profile', args: { nickname: 'Yo' }, callId: 'fc-1' }]);
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

    await handlers.update_profile({ nickname: 'Yo' }, live);

    expect(applied).toEqual([
      { type: 'refresh', what: 'profile' },
      { type: 'open', destination: 'profile' },
    ]);
  });

  test('tells Gemini the action failed when the server does, so it does not claim success', async () => {
    const { applied, handlers } = setup(async () => {
      throw new Error('500');
    });

    expect(await handlers.update_profile({ nickname: 'Yo' }, live)).toBe(SERVER_TOOL_UNAVAILABLE);
    expect(applied).toEqual([]);
  });

  test('a slow server is an unknown outcome, not a failure to retry', async () => {
    const { handlers } = setup(() => new Promise(() => undefined));

    expect(await handlers.open_story({ query: 'Lagos' }, live)).toBe(SERVER_TOOL_UNCERTAIN);
  });

  test('an HTTP timeout is an unknown outcome too', async () => {
    const { handlers } = setup(async () => {
      throw Object.assign(new Error('timeout of 8000ms exceeded'), { code: 'ECONNABORTED' });
    });

    expect(await handlers.update_profile({ nickname: 'Yo' }, live)).toBe(SERVER_TOOL_UNCERTAIN);
  });

  test('after the call ends, refreshes caches but never navigates', async () => {
    const { applied, handlers } = setup(async () => ({
      data: {
        result: 'Done.',
        effects: [
          { type: 'refresh', what: 'profile' },
          { type: 'open', destination: 'profile' },
          { type: 'open_story', id: '0123456789abcdef01234567' },
        ],
      },
    }));

    await handlers.update_profile({ nickname: 'Yo' }, { callId: 'fc-2', isLive: () => false });

    expect(applied).toEqual([{ type: 'refresh', what: 'profile' }]);
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

  test('keeps observation refreshes, so remembered or forgotten facts show up', () => {
    expect(
      parseVoiceToolEffects([
        { type: 'refresh', what: 'observations' },
        { type: 'refresh', what: 'beneficiaries' },
      ]),
    ).toEqual([
      { type: 'refresh', what: 'observations' },
      { type: 'refresh', what: 'beneficiaries' },
    ]);
  });

  test('handles a missing or malformed list', () => {
    expect(parseVoiceToolEffects(undefined)).toEqual([]);
    expect(parseVoiceToolEffects({})).toEqual([]);
  });
});
