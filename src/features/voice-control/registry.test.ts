import { describe, expect, test } from 'bun:test';

import { VoiceControlRegistry } from './registry';

function button(registry: VoiceControlRegistry, label: string, options: { active?: boolean } = {}) {
  const pressed: string[] = [];
  const remove = registry.addPressTarget({
    label,
    press: () => pressed.push(label),
    isActive: () => options.active ?? true,
  });
  return { pressed, remove };
}

describe('VoiceControlRegistry.press', () => {
  test('presses the button whose label matches, ignoring case and punctuation', () => {
    const registry = new VoiceControlRegistry();
    const save = button(registry, 'Save changes');
    button(registry, 'Cancel');

    expect(registry.press('save changes!')).toBe('Pressed "Save changes".');
    expect(save.pressed).toEqual(['Save changes']);
  });

  test('matches a label the host only partly said', () => {
    const registry = new VoiceControlRegistry();
    const save = button(registry, 'Save changes');

    registry.press('save');

    expect(save.pressed).toEqual(['Save changes']);
  });

  test('lists the options instead of guessing when more than one matches', () => {
    const registry = new VoiceControlRegistry();
    const first = button(registry, 'Open voice call');
    const second = button(registry, 'Open settings');

    const result = registry.press('open');

    expect(result).toContain('more than one');
    expect(result).toContain('"Open voice call"');
    expect(result).toContain('"Open settings"');
    expect([...first.pressed, ...second.pressed]).toEqual([]);
  });

  test('says what is on screen when nothing matches', () => {
    const registry = new VoiceControlRegistry();
    button(registry, 'Save');
    button(registry, 'Continue');

    expect(registry.press('publish')).toBe(
      'No button called "publish" on this screen. Buttons on screen: "Save", "Continue".',
    );
  });

  test('only sees buttons on the screen in front of the host', () => {
    const registry = new VoiceControlRegistry();
    const hidden = button(registry, 'Save', { active: false });

    expect(registry.press('save')).toContain('No button called "save"');
    expect(hidden.pressed).toEqual([]);
  });

  test('never presses buttons that delete, cancel, pay or sign out', () => {
    const registry = new VoiceControlRegistry();
    const risky = ['Delete story', 'Cancel plan', 'Subscribe', 'Pay now', 'Sign out', 'Log out', 'Remove beneficiary', 'Upgrade to Pro'].map(
      (label) => button(registry, label),
    );

    for (const label of ['delete story', 'cancel plan', 'subscribe', 'pay now', 'sign out', 'log out', 'remove beneficiary', 'upgrade to pro']) {
      expect(registry.press(label)).toContain('needs a tap from the host');
    }
    expect(risky.flatMap((target) => target.pressed)).toEqual([]);
  });

  test('forgets a button once it unmounts', () => {
    const registry = new VoiceControlRegistry();
    const save = button(registry, 'Save');
    save.remove();

    expect(registry.press('save')).toContain('No button called');
  });
});

describe('VoiceControlRegistry toggles', () => {
  function toggle(registry: VoiceControlRegistry, label: string, on: boolean) {
    const state = { on, presses: 0 };
    registry.addPressTarget({
      label,
      press: () => {
        state.presses += 1;
        state.on = !state.on;
      },
      isActive: () => true,
      isOn: () => state.on,
    });
    return state;
  }

  test('turns an option on when asked and it is off', () => {
    const registry = new VoiceControlRegistry();
    const annual = toggle(registry, 'Annual', false);

    expect(registry.press('annual', true)).toBe('Pressed "Annual". It is now on.');
    expect(annual.presses).toBe(1);
  });

  test('leaves an option alone when it is already how the host wants it', () => {
    const registry = new VoiceControlRegistry();
    const reminders = toggle(registry, 'Daily reminders', true);

    expect(registry.press('daily reminders', true)).toBe('"Daily reminders" is already on.');
    expect(registry.press('daily reminders', false)).toBe('Pressed "Daily reminders". It is now off.');
    expect(reminders.presses).toBe(1);
  });

  test('shows on/off state when listing what is on screen', () => {
    const registry = new VoiceControlRegistry();
    toggle(registry, 'Monthly', false);
    toggle(registry, 'Annual', true);

    expect(registry.press('weekly')).toContain('"Monthly" (off), "Annual" (on)');
  });
});

describe('VoiceControlRegistry.unlabelledOnScreen', () => {
  test('counts unlabelled tappables on the screen in front, for labelling later', () => {
    const registry = new VoiceControlRegistry();
    registry.addUnlabelledTarget({ isActive: () => true });
    const remove = registry.addUnlabelledTarget({ isActive: () => true });
    registry.addUnlabelledTarget({ isActive: () => false });
    remove();

    expect(registry.unlabelledOnScreen()).toBe(1);
  });
});

describe('VoiceControlRegistry.scroll', () => {
  test('scrolls the list on the screen in front of the host', () => {
    const registry = new VoiceControlRegistry();
    const moves: string[] = [];
    registry.addScrollTarget({ scroll: (to) => moves.push(`hidden:${to}`), isActive: () => false });
    registry.addScrollTarget({ scroll: (to) => moves.push(`front:${to}`), isActive: () => true });

    expect(registry.scroll('down')).toBe('Scrolled down.');
    expect(registry.scroll('top')).toBe('Scrolled to the top.');
    expect(moves).toEqual(['front:down', 'front:top']);
  });

  test('says so when the screen has nothing to scroll', () => {
    expect(new VoiceControlRegistry().scroll('down')).toBe('There is nothing to scroll on this screen.');
  });
});
