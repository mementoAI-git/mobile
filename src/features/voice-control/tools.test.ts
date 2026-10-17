import { describe, expect, test } from 'bun:test';

import { VoiceControlRegistry } from './registry';
import { createScreenControlHandlers, SCREEN_CONTROL_TOOLS } from './tools';

function setup(options: { canGoBack?: boolean } = {}) {
  const registry = new VoiceControlRegistry();
  const navigation: string[] = [];
  const handlers = createScreenControlHandlers({
    registry,
    canGoBack: () => options.canGoBack ?? true,
    goBack: () => navigation.push('back'),
    settleMs: 0,
  });
  return { registry, navigation, handlers };
}

describe('screen control tools', () => {
  test('handles exactly the declared tools', () => {
    expect(Object.keys(setup().handlers).sort()).toEqual([...SCREEN_CONTROL_TOOLS].sort());
  });

  test('press_button presses by label', async () => {
    const { registry, handlers } = setup();
    const pressed: string[] = [];
    registry.addPressTarget({ label: 'Save', press: () => pressed.push('Save'), isActive: () => true });

    expect(await handlers.press_button({ label: 'save' })).toBe('Pressed "Save".');
    expect(pressed).toEqual(['Save']);
  });

  test('press_button passes turn_on through for switches and options', async () => {
    const { registry, handlers } = setup();
    registry.addPressTarget({ label: 'Annual', press: () => undefined, isActive: () => true, isOn: () => true });

    expect(await handlers.press_button({ label: 'annual', turn_on: true })).toBe('"Annual" is already on.');
  });

  test('press_button asks for a label when none was given', async () => {
    expect(await setup().handlers.press_button({})).toContain('Which button');
  });

  test('scroll accepts the four directions and nothing else', async () => {
    const { registry, handlers } = setup();
    const moves: string[] = [];
    registry.addScrollTarget({ scroll: (to) => void moves.push(to), isActive: () => true });

    await handlers.scroll({ direction: 'down' });
    await handlers.scroll({ direction: 'top' });
    expect(await handlers.scroll({ direction: 'sideways' })).toContain('up, down, top or bottom');
    expect(moves).toEqual(['down', 'top']);
  });

  test('go_back goes back when there is somewhere to go', async () => {
    const { handlers, navigation } = setup();
    expect(await handlers.go_back({})).toBe('Went back. Still on an app screen.');
    expect(navigation).toEqual(['back']);
  });

  test('go_back says so when this is the first screen', async () => {
    const { handlers, navigation } = setup({ canGoBack: false });
    expect(await handlers.go_back({})).toContain('no screen to go back to');
    expect(navigation).toEqual([]);
  });
});

describe('screen control tools report where the host is', () => {
  test('go_back names the screen it left and the one it reached', async () => {
    const registry = new VoiceControlRegistry();
    let screen = 'A story';
    registry.setScreenName(() => screen);
    const handlers = createScreenControlHandlers({
      registry,
      canGoBack: () => true,
      goBack: () => {
        screen = 'Your stories';
      },
      settleMs: 0,
    });
    expect(await handlers.go_back({})).toBe('Went back from A story. Now on Your stories.');
  });

  test('press_button says where a press led', async () => {
    const registry = new VoiceControlRegistry();
    let screen = 'Home (Overview)';
    registry.setScreenName(() => screen);
    registry.addPressTarget({
      label: 'Reply Prompt →',
      press: () => {
        screen = 'A conversation';
      },
      isActive: () => true,
    });
    const handlers = createScreenControlHandlers({
      registry,
      canGoBack: () => true,
      goBack: () => undefined,
      settleMs: 0,
    });
    expect(await handlers.press_button({ label: 'reply prompt' })).toBe(
      'Pressed "Reply Prompt →". Now on A conversation.',
    );
  });

  test('type_text adds by default and sends only when asked', async () => {
    const registry = new VoiceControlRegistry();
    let value = '';
    const sent: string[] = [];
    registry.addTextTarget({
      label: 'message',
      read: () => value,
      write: (text) => {
        value = text;
      },
      submit: () => sent.push(value),
      isActive: () => true,
    });
    const handlers = createScreenControlHandlers({
      registry,
      canGoBack: () => false,
      goBack: () => undefined,
      settleMs: 0,
    });
    await handlers.type_text({ text: 'I miss' });
    await handlers.type_text({ text: 'grandma', send: true });
    expect(value).toBe('I miss grandma');
    expect(sent).toEqual(['I miss grandma']);
  });
});
