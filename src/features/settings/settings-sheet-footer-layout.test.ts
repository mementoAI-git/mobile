// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const fixedFooterSheets = [
  '../../components/sheets/EditProfileSheet.tsx',
  '../../components/sheets/SetupTwoFactorSheet.tsx',
].map((path) => ({
  path,
  source: readFileSync(new URL(path, import.meta.url), 'utf8'),
}));

describe('Settings sheet footer layout', () => {
  test('uses a bounded bottom-sheet container above fixed action footers', () => {
    for (const sheet of fixedFooterSheets) {
      expect(sheet.source).not.toMatch(
        /<BottomSheetView\s+style=\{\{\s*flex:\s*1\s*\}\}/,
      );
      expect(sheet.source).toMatch(
        /return\s*\(\s*<View\s+style=\{\{\s*flex:\s*1\s*\}\}/,
      );
      expect(sheet.source).toMatch(
        /<BottomSheetScrollView[\s\S]*?style=\{\{[\s\S]*?flex:\s*1(?:,|\s*\})/,
      );
    }
  });

  test('disables dynamic sizing for fixed-height settings forms', () => {
    const manager = readFileSync(
      new URL('../../components/sheets/SheetManager.tsx', import.meta.url),
      'utf8',
    );

    for (const sheetName of ['edit-profile', 'setup-two-factor']) {
      expect(manager).toMatch(
        new RegExp(`'${sheetName}': \\{[^\\n]+dynamic: false`),
      );
    }
  });

  test('renders Edit Profile actions as a flex sibling below the scroll view', () => {
    const editProfile = fixedFooterSheets.find(
      (sheet) => sheet.path.includes('EditProfileSheet'),
    )?.source;
    const manager = readFileSync(
      new URL('../../components/sheets/SheetManager.tsx', import.meta.url),
      'utf8',
    );

    expect(editProfile).not.toContain('setSheetFooter');
    expect(editProfile).toMatch(
      /<\/BottomSheetScrollView>\s*\{footer\}/,
    );
    expect(manager).not.toContain('BottomSheetFooter');
    expect(manager).not.toContain('footerComponent={renderFooter}');
  });

  test('lets flex layout measure the Edit Profile footer outside the scroll viewport', () => {
    const editProfile = fixedFooterSheets.find(
      (sheet) => sheet.path.includes('EditProfileSheet'),
    )?.source;
    const manager = readFileSync(
      new URL('../../components/sheets/SheetManager.tsx', import.meta.url),
      'utf8',
    );

    expect(editProfile).not.toContain('sheetFooterBottomInset');
    expect(editProfile).not.toContain('EDIT_PROFILE_FOOTER_HEIGHT');
    expect(editProfile).toMatch(/paddingBottom:\s*20/);
    expect(editProfile).not.toContain('enableFooterMarginAdjustment');
    expect(manager).not.toContain('sheetFooterBottomInset={insets.bottom}');
  });

  test('expands Edit Profile to full height when form scrolling begins', () => {
    const editProfile = fixedFooterSheets.find(
      (sheet) => sheet.path.includes('EditProfileSheet'),
    )?.source;
    const manager = readFileSync(
      new URL('../../components/sheets/SheetManager.tsx', import.meta.url),
      'utf8',
    );

    expect(manager).toMatch(
      /'edit-profile':\s*\{[^}]*snapPoints:\s*(?:\['92%',\s*'100%'\]|\['100%'\])/,
    );
    expect(manager).toContain('modalRef.current?.expand()');
    expect(manager).toContain('expandSheet={expandSheet}');
    expect(editProfile).toContain('expandSheet: () => void');
    expect(editProfile).toContain('onScrollBeginDrag={expandSheet}');
  });
});
