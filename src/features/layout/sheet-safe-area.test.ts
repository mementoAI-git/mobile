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
  const chrome = await Bun.file('src/components/sheets/use-sheet-chrome.ts').text();
  expect(chrome).toContain('handleStyle: SHEET_HEADER_HANDLE_STYLE');
  for (const file of ['QuickCaptureSheet', 'ShareMemorySheet', 'MemoryInsightsSheet', 'VoiceCallSettingsSheet']) {
    const source = await Bun.file(`src/components/sheets/${file}.tsx`).text();
    expect(source.includes('pt-2')).toBe(false);
  }
});

test('keeps the sheet close control exactly square', async () => {
  const { SHEET_CLOSE_BUTTON_STYLE } = await import('./sheet-safe-area');
  expect(SHEET_CLOSE_BUTTON_STYLE.width).toBe(44);
  expect(SHEET_CLOSE_BUTTON_STYLE.height).toBe(SHEET_CLOSE_BUTTON_STYLE.width);
  expect(SHEET_CLOSE_BUTTON_STYLE.minHeight).toBe(SHEET_CLOSE_BUTTON_STYLE.height);
  const sheet = await Bun.file('src/components/sheets/QuickCaptureSheet.tsx').text();
  const header = await Bun.file('src/components/sheets/SheetHeader.tsx').text();
  expect(sheet).toContain('<SheetHeader');
  expect(header).toContain('style={SHEET_CLOSE_BUTTON_STYLE}');
});

test('centers standard sheet titles with their close controls', async () => {
  for (const file of ['QuickCaptureSheet', 'ShareMemorySheet', 'MemoryInsightsSheet', 'VoiceCallSettingsSheet', 'DailyRitualSheet', 'CapsuleDetailSheet', 'CreateCapsuleSheet', 'CreateMemorySheet', 'FeedbackSheet']) {
    const source = await Bun.file(`src/components/sheets/${file}.tsx`).text();
    expect(source.includes('flex-row items-start justify-between')).toBe(false);
    expect(source).toContain('<SheetHeader');
  }
});

test('bottom CTAs sit 8px above the home indicator', async () => {
  const { getSheetActionsBottomPadding } = await import('./sheet-safe-area');
  expect(getSheetActionsBottomPadding(34)).toBe(42);
  expect(getSheetActionsBottomPadding(0)).toBe(20);
  const editor = await Bun.file('app/editor.tsx').text();
  expect(editor).toContain('paddingBottom: getSheetActionsBottomPadding(insets.bottom)');
  expect(editor).not.toContain('insets.bottom + 24');
});

test('every sheet places its bottom CTA with the shared helper', async () => {
  const files = [
    'src/components/sheets/SheetManager.tsx', 'src/components/sheets/CreateCapsuleSheet.tsx', 'src/components/sheets/CapsuleDetailSheet.tsx',
    'src/components/sheets/MemoryInsightsSheet.tsx', 'src/components/sheets/StreakSheet.tsx', 'src/components/sheets/VoiceCallSettingsSheet.tsx',
    'src/components/sheets/PreviewCapsuleModal.tsx', 'src/components/sheets/SelectFromMemoryModal.tsx', 'src/components/sheets/SelectFromMediaModal.tsx',
    'src/components/sheets/PublishPrivacySheet.tsx', 'src/components/capsule/StylePicker.tsx', 'src/components/ui/ConfirmDialog.tsx',
    'src/components/chat/ChatAttachmentPickerSheet.tsx',
  ];
  for (const file of files) {
    const source = await Bun.file(file).text();
    expect(source, file).toContain('getSheetActionsBottomPadding(insets.bottom)');
    expect(source, file).not.toMatch(/insets\.bottom \+ (6|12|16|20|24)\b/);
  }
});

test('sheets with bottom buttons pin them with SheetActions on a filling root', async () => {
  const sheets = [
    'AppearanceSheet', 'CalendarSheets', 'BeneficiaryActionsSheet', 'EditAboutMeSheet', 'GuardianLensSheet',
    'ExportArchiveSheet', 'DailyRitualSheet', 'CapsuleSealedSheet', 'UpgradePromptSheet', 'CelebrationSheet',
    'DigitalMindSheet', 'ObservationNoteSheet', 'FeedbackSheet', 'ShareMemorySheet',
  ];
  for (const sheet of sheets) {
    const source = await Bun.file(`src/components/sheets/${sheet}.tsx`).text();
    expect(source, sheet).toContain('<SheetActions');
    expect(source, sheet).toContain('SHEET_FILL');
  }
  const actions = await Bun.file('src/components/sheets/SheetActions.tsx').text();
  expect(actions).toContain("marginTop: 'auto'");
});
