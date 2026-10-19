import { afterEach, describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { useUiStore } from '@/store/ui.store';

const header = readFileSync('src/components/ui/DashboardHeader.tsx', 'utf8');
const manager = readFileSync('src/components/sheets/SheetManager.tsx', 'utf8');
afterEach(() => {
  useUiStore.getState().closeSheet();
  useUiStore.getState().setAppReady(false);
});

describe('mobile quick tools', () => {
  test('replaces the shared header avatar with the Quick tools action', () => {
    expect(header).not.toContain('<Avatar');
    expect(header).not.toContain("router.push('/account')");
    expect(header).toContain('accessibilityLabel="Quick tools"');
    expect(header).toContain("openSheet('quick-tools')");
  });
  test('registers the menu as a native bottom sheet', () => {
    expect(manager).toContain("'quick-tools': { component: QuickToolsSheet, dynamic: true, horizontalPadding: 20 }");
    useUiStore.getState().setAppReady(true);
    useUiStore.getState().openMenu();
    useUiStore.getState().openSheet('quick-tools');
    expect(useUiStore.getState().activeSheet).toBe('quick-tools');
    expect(useUiStore.getState().menuOpen).toBe(false);
  });
  test('matches web music, Quick note and Add people actions', () => {
    const sheet = readFileSync('src/components/sheets/QuickToolsSheet.tsx', 'utf8');
    expect(sheet).toContain('<MusicControllerCard');
    expect(sheet).toContain('Quick note');
    expect(sheet).toContain('Add people');
    expect(sheet).toContain("openSheet('quick-capture')");
    expect(sheet).toContain("openSheet('add-beneficiary')");
    expect(sheet).toContain('onClose(openQuickNote)');
    expect(sheet).toContain('onClose(openAddPeople)');
  });
});

test('uses web artwork and explicit action-card padding', () => {
  const sheet = readFileSync('src/components/sheets/QuickToolsSheet.tsx', 'utf8');
  expect(sheet).toContain('quick-note.png');
  expect(sheet).toContain('add-people.png');
  expect(sheet).not.toContain('NotebookPen');
  expect(sheet).not.toContain('UserPlus');
  expect(sheet).toContain('height: 85, padding: 12');
  expect(sheet).toContain("alignItems: 'flex-start', justifyContent: 'space-between'");
  expect(sheet).toContain('<MusicControllerCard compact />');
  expect(header).toContain('<QuickToolsIcon');
});

test('stacks action labels under icons and enforces web geometry', () => {
  const sheet = readFileSync('src/components/sheets/QuickToolsSheet.tsx', 'utf8');
  const music = readFileSync('src/components/account/MusicControllerCard.tsx', 'utf8');
  const slider = readFileSync('src/components/ui/VolumeSlider.tsx', 'utf8');
  expect(sheet).toContain("flexDirection: 'column'");
  expect(sheet).toContain('borderRadius: 14');
  expect(music).toContain('compact ? { borderRadius: 14, padding: 16, gap: 12 }');
  expect(music).toContain('size={compact ? 48 : 44}');
  expect(music).toContain('variant={compact ? \'web\' : \'default\'}');
  expect(slider).toContain("variant === 'web' ? 18 : 4");
  expect(slider).toContain('borderWidth: web ? 1 : 2');
});

test('adds the themed web grid texture to both action buttons', () => {
  const sheet = readFileSync('src/components/sheets/QuickToolsSheet.tsx', 'utf8');
  expect(sheet.match(/<QuickActionTexture \/>/g)).toHaveLength(2);
  expect(sheet).toContain('width={32} height={32} patternUnits="userSpaceOnUse"');
  expect(sheet).toContain('stroke={colors.strokeWeaker}');
  expect(sheet).toContain("skewX: '-6deg'");
  expect(sheet).toContain('opacity: 0.4');
  expect(sheet).toContain('pointerEvents="none"');
  expect(sheet).toContain("borderRadius: 14, overflow: 'hidden'");
});
