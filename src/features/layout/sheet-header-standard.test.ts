// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('bottom sheet header standard', () => {
  test('the shared header pairs a sheetTitle with a 44px close control', () => {
    const header = read('src/components/sheets/SheetHeader.tsx');
    expect(header).toContain('TYPE.sheetTitle');
    expect(header).toContain('SHEET_CLOSE_BUTTON_STYLE');
    expect(header).toContain('accessibilityRole="header"');
  });

  test('the Select sheet uses the shared header titled by the field label', () => {
    const sheet = read('src/components/sheets/SelectSheet.tsx');
    const trigger = read('src/components/ui/Select.tsx');
    expect(sheet).toContain('<SheetHeader');
    expect(sheet).not.toContain('uppercase tracking-widest');
    expect(trigger).toContain('title: label');
  });
});
