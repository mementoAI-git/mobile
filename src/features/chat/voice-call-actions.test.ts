import { describe, expect, test } from 'bun:test';

import {
  CALL_ACTION_TOOLS,
  createCallActionHandlers,
  resolveVoiceDestination,
  VOICE_DESTINATIONS,
  type CallControls,
} from './voice-call-actions';

function fakeControls() {
  const calls: string[] = [];
  let pendingThen: (() => void) | undefined;
  const controls: CallControls = {
    endAfterGoodbye: (then) => {
      calls.push('endAfterGoodbye');
      pendingThen = then;
    },
    setMuted: (muted) => calls.push(`setMuted:${muted}`),
    navigate: (href) => calls.push(`navigate:${href}`),
  };
  return { controls, calls, finishGoodbye: () => pendingThen?.() };
}

describe('voice call actions', () => {
  test('covers the three call tools', () => {
    const { controls } = fakeControls();
    expect(Object.keys(createCallActionHandlers(controls))).toEqual(CALL_ACTION_TOOLS);
  });

  test('end_call hangs up after the goodbye', async () => {
    const { controls, calls } = fakeControls();
    const result = await createCallActionHandlers(controls).end_call({});

    expect(calls).toEqual(['endAfterGoodbye']);
    expect(result).toMatch(/goodbye/);
  });

  test('set_microphone only mutes', async () => {
    const { controls, calls } = fakeControls();
    const handlers = createCallActionHandlers(controls);

    expect(await handlers.set_microphone({ muted: true })).toMatch(/tap to unmute/);
    expect(await handlers.set_microphone({ muted: false })).toMatch(/cannot unmute/);
    expect(calls).toEqual(['setMuted:true']);
  });

  test('open_screen with keep_talking navigates now', async () => {
    const { controls, calls } = fakeControls();

    await createCallActionHandlers(controls).open_screen({
      destination: 'insights',
      keep_talking: true,
    });

    expect(calls).toEqual(['navigate:/insights']);
  });

  test('open_screen without keep_talking navigates after the goodbye', async () => {
    const { controls, calls, finishGoodbye } = fakeControls();

    await createCallActionHandlers(controls).open_screen({
      destination: 'settings',
      keep_talking: false,
    });
    expect(calls).toEqual(['endAfterGoodbye']);

    finishGoodbye();
    expect(calls).toEqual(['endAfterGoodbye', 'navigate:/settings']);
  });

  test('unknown or inherited destinations do nothing', async () => {
    const { controls, calls } = fakeControls();
    const handlers = createCallActionHandlers(controls);

    expect(await handlers.open_screen({ destination: 'admin_panel', keep_talking: true })).toMatch(
      /isn't available/,
    );
    expect(resolveVoiceDestination('toString')).toBeUndefined();
    // Time capsules are paused: never open their Coming soon page.
    expect(resolveVoiceDestination('time_capsules')).toBeUndefined();
    expect(resolveVoiceDestination(42)).toBeUndefined();
    expect(calls).toEqual([]);
  });

  test('every destination is an app route', () => {
    for (const { href } of Object.values(VOICE_DESTINATIONS)) {
      expect(href.startsWith('/')).toBe(true);
    }
    expect(Object.keys(VOICE_DESTINATIONS)).toHaveLength(19);
  });

  test("'connections' opens the same screen as the API's older 'beneficiaries'", () => {
    expect(VOICE_DESTINATIONS.connections.href).toBe(VOICE_DESTINATIONS.beneficiaries.href);
  });
});