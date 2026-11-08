import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import {
  SHEET_BACKDROP,
  SHEET_GRABBER,
  SHEET_RADIUS,
  clampSheetSnapPoints,
  sheetMaxHeight,
  sheetMinHeight,
  sheetTopInset,
} from './sheet-presentation';

describe('bottom sheets match web phone sheets', () => {
  test('use web radius, grabber and backdrop values', () => {
    expect(SHEET_RADIUS).toBe(20);
    expect(SHEET_GRABBER).toEqual({ width: 36, height: 4, borderRadius: 2, opacity: 0.35 });
    expect(SHEET_BACKDROP.light).toEqual({ color: 'rgb(94,94,94)', opacity: 0.5 });
    expect(SHEET_BACKDROP.dark).toEqual({ color: 'rgb(0,0,0)', opacity: 0.72 });
  });

  test('stop at 92% of the screen and start at min(524, 92%)', () => {
    expect(sheetMaxHeight(844)).toBe(776);
    expect(sheetTopInset(844, 47)).toBe(68);
    expect(sheetTopInset(844, 80)).toBe(80);
    expect(sheetMinHeight(844)).toBe(524);
    expect(sheetMinHeight(500)).toBe(460);
  });

  test('raise snap points below the minimum and drop duplicates', () => {
    const inset = sheetTopInset(844, 47); // container 776
    expect(clampSheetSnapPoints(['42%', '65%'], 844, inset)).toEqual([524]);
    expect(clampSheetSnapPoints(['50%', '92%'], 844, inset)).toEqual([524, '92%']);
    expect(clampSheetSnapPoints(['90%'], 844, inset)).toEqual(['90%']);
  });

  test('every bottom sheet uses the shared chrome', () => {
    for (const file of [
      'src/components/sheets/SheetManager.tsx',
      'src/components/ui/ConfirmDialog.tsx',
      'src/components/sheets/PublishPrivacySheet.tsx',
      'src/components/sheets/PreviewCapsuleModal.tsx',
      'src/components/sheets/SelectFromMemoryModal.tsx',
      'src/components/sheets/SelectFromMediaModal.tsx',
      'src/components/sheets/CreateCapsuleSheet.tsx',
      'src/components/capsule/StylePicker.tsx',
      'src/components/chat/EmojiPickerSheet.tsx',
      'src/components/chat/ChatAttachmentPickerSheet.tsx',
      'app/editor.tsx',
    ]) {
      const source = readFileSync(file, 'utf8');
      expect(source).toContain('useSheetChrome(');
      expect(source).not.toContain('handleIndicatorStyle=');
      expect(source).not.toContain('getSheetTopInset(');
    }
  });

  test('the side menu sits on the sheet surface without the dotted pattern', () => {
    const menu = readFileSync('src/components/navigation/AppMenuLayout.tsx', 'utf8');
    expect(menu).toContain('backgroundColor: COLORS.sheet');
    expect(menu).not.toContain('welcome_bg');
  });

  test('Explore is called Topics wherever people see it', () => {
    expect(readFileSync('src/components/navigation/AppMenuLayout.tsx', 'utf8')).toContain("{ label: 'Topics', path: '/(tabs)/explore'");
    expect(readFileSync('src/components/TabBar.tsx', 'utf8')).toContain("explore:  'Topics'");
    expect(readFileSync('app/(tabs)/explore/index.tsx', 'utf8')).toContain('<DashboardHeader title="Topics" />');
  });
});
