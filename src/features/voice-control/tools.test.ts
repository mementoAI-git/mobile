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

  test('press_button asks for a label when none was given', async () => {
    expect(await setup().handlers.press_button({})).toContain('Which button');
  });

  test('scroll accepts the four directions and nothing else', async () => {
    const { registry, handlers } = setup();
    const moves: string[] = [];
    registry.addScrollTarget({ scroll: (to) => moves.push(to), isActive: () => true });

    await handlers.scroll({ direction: 'down' });
    await handlers.scroll({ direction: 'top' });
    expect(await handlers.scroll({ direction: 'sideways' })).toContain('up, down, top or bottom');
    expect(moves).toEqual(['down', 'top']);
  });

  test('go_back goes back when there is somewhere to go', async () => {
    const { handlers, navigation } = setup();
    expect(await handlers.go_back({})).toBe('Went back.');
    expect(navigation).toEqual(['back']);
  });

  test('go_back says so when this is the first screen', async () => {
    const { handlers, navigation } = setup({ canGoBack: false });
    expect(await handlers.go_back({})).toContain('no screen to go back to');
    expect(navigation).toEqual([]);
  });
});
