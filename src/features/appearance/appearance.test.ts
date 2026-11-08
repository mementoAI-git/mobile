import { describe, expect, test } from 'bun:test';
import { parseAppearance, resolveAppearance } from './appearance';

describe('appearance preference', () => {
  test('falls back to system for missing or invalid saved values', () => {
    for (const value of [null, '', 'sepia', '{}']) expect(parseAppearance(value)).toBe('system');
    expect(parseAppearance('dark')).toBe('dark');
    expect(parseAppearance('light')).toBe('light');
  });
  test('explicit choices override the device; system follows it', () => {
    expect(resolveAppearance('light', 'dark')).toBe('light');
    expect(resolveAppearance('dark', 'light')).toBe('dark');
    expect(resolveAppearance('system', 'dark')).toBe('dark');
    expect(resolveAppearance('system', null)).toBe('light');
  });
});

import { resolveThemedStyles } from './themed-styles';
import { COLORS } from '../../constants/tokens';
import { DARK_COLORS } from '../../constants/appearance';

test('dark styles preserve inverse text and distinguish border and text roles', () => {
  const input = {
    label: { color: COLORS.textWeak },
    border: { borderColor: COLORS.strokeStrong },
    brandButton: { color: COLORS.textInverse, backgroundColor: COLORS.brand },
    page: { backgroundColor: COLORS.background },
  };
  const result = resolveThemedStyles(input);
  expect(result.label.color).toBe(DARK_COLORS.textWeak);
  expect(result.border.borderColor).toBe(DARK_COLORS.strokeStrong);
  expect(result.brandButton).toEqual(input.brandButton);
  expect(result.page.backgroundColor).toBe(DARK_COLORS.background);
  expect(input.page.backgroundColor).toBe(COLORS.background);
});

import { DEEP_SKY_COLORS } from '../../constants/appearance';
import { appearanceLabel } from './appearance';

test('Deep Sky persists as its own choice and uses dark controls regardless of the OS', () => {
  expect(parseAppearance('deep-sky')).toBe('deep-sky');
  expect(resolveAppearance('deep-sky', 'light')).toBe('dark');
  expect(resolveAppearance('deep-sky', 'dark')).toBe('dark');
  expect(appearanceLabel('deep-sky')).toBe('Deep Sky');
  const styles = resolveThemedStyles({ page: { backgroundColor: COLORS.background }, label: { color: COLORS.textStrong } }, DEEP_SKY_COLORS);
  expect(styles.page.backgroundColor).toBe('transparent');
  expect(styles.label.color).toBe(DEEP_SKY_COLORS.textStrong);
  // Cards, buttons and tags use the weak fill on the sky; floating surfaces stay opaque.
  expect(DEEP_SKY_COLORS.card).toBe(DEEP_SKY_COLORS.fillWeak);
  expect(DEEP_SKY_COLORS.cardRaised).toBe(DEEP_SKY_COLORS.fillWeak);
  expect(DEEP_SKY_COLORS.popover).toBe('#191e2c');
});

test('floating surfaces use the opaque popover token, not the card fill', async () => {
  const read = (path: string) => Bun.file(new URL(path, import.meta.url)).text();
  const files = {
    toast: await read('../../components/ui/Toast.tsx'),
    actions: await read('../../components/chat/MessageActionsProvider.tsx'),
    language: await read('../../components/chat/VoiceLanguageSelect.tsx'),
    picker: await read('../../components/ui/MediaPickerMenu.tsx'),
    editorBar: await read('../../components/ui/EditorActionBar.tsx'),
    tabBar: await read('../../components/TabBar.tsx'),
  };
  for (const source of Object.values(files)) expect(source).toMatch(/(COLORS|colors)\.popover/);
  expect(files.tabBar).not.toContain('backgroundColor: COLORS.card');
});
