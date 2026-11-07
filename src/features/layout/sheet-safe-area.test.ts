import {describe, expect, test} from 'bun:test';
import {
  getSheetBottomPadding,
  getSheetTopInset,
} from './sheet-safe-area';

describe('sheet safe-area layout', () => {
  test('keeps designed footer spacing outside the device bottom inset', () => {
    expect(getSheetBottomPadding(34, 12)).toBe(46);
    expect(getSheetBottomPadding(0, 20)).toBe(20);
    expect(getSheetBottomPadding(-4, 16)).toBe(16);
  });

  test('never sends a negative top inset to a sheet container', () => {
    expect(getSheetTopInset(59)).toBe(59);
    expect(getSheetTopInset(0)).toBe(0);
    expect(getSheetTopInset(-8)).toBe(0);
  });
});

test('leaves an 8px gap between the visible drag indicator and the header', async () => {
  const { SHEET_HEADER_HANDLE_STYLE, SHEET_HEADER_GAP } = await import('./sheet-safe-area');
  expect(SHEET_HEADER_GAP).toBe(8);
  expect(SHEET_HEADER_HANDLE_STYLE.height).toBe(20);
  expect(SHEET_HEADER_HANDLE_STYLE.paddingBottom).toBe(8);
  expect(SHEET_HEADER_HANDLE_STYLE.paddingTop + 4 + SHEET_HEADER_HANDLE_STYLE.paddingBottom).toBe(20);
  const manager = await Bun.file('src/components/sheets/SheetManager.tsx').text();
  expect(manager).toContain('handleStyle={SHEET_HEADER_HANDLE_STYLE}');
  for (const file of ['QuickToolsSheet', 'QuickCaptureSheet', 'ShareMemorySheet', 'MemoryInsightsSheet', 'VoiceCallSettingsSheet']) {
    const source = await Bun.file(`src/components/sheets/${file}.tsx`).text();
    expect(source.includes('pt-2')).toBe(false);
  }
});

test('keeps the Quick tools close control exactly square', async () => {
  const { SHEET_CLOSE_BUTTON_STYLE } = await import('./sheet-safe-area');
  expect(SHEET_CLOSE_BUTTON_STYLE.width).toBe(44);
  expect(SHEET_CLOSE_BUTTON_STYLE.height).toBe(SHEET_CLOSE_BUTTON_STYLE.width);
  expect(SHEET_CLOSE_BUTTON_STYLE.minHeight).toBe(SHEET_CLOSE_BUTTON_STYLE.height);
  const sheet = await Bun.file('src/components/sheets/QuickToolsSheet.tsx').text();
  expect(sheet).toContain('style={SHEET_CLOSE_BUTTON_STYLE}');
});

test('centers standard sheet titles with their close controls', async () => {
  for (const file of ['QuickToolsSheet', 'QuickCaptureSheet', 'ShareMemorySheet', 'MemoryInsightsSheet', 'VoiceCallSettingsSheet', 'DailyRitualSheet', 'CapsuleDetailSheet', 'CreateCapsuleSheet', 'CreateMemorySheet', 'FeedbackSheet']) {
    const source = await Bun.file(`src/components/sheets/${file}.tsx`).text();
    expect(source.includes('flex-row items-start justify-between')).toBe(false);
    expect(source.includes('flex-row items-center justify-between')).toBe(true);
  }
});
