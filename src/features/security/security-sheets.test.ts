// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('Security sheets', () => {
  test('registers password and two-factor sheets with existing API logic', async () => {
    const manager = await Bun.file(
      new URL('../../components/sheets/SheetManager.tsx', import.meta.url),
    ).text();
    const password = await Bun.file(
      new URL('../../components/sheets/ChangePasswordSheet.tsx', import.meta.url),
    ).text();
    const twoFactor = await Bun.file(
      new URL('../../components/sheets/SetupTwoFactorSheet.tsx', import.meta.url),
    ).text();

    expect(manager).toContain("import { ChangePasswordSheet }");
    expect(manager).toContain("import { SetupTwoFactorSheet }");
    expect(manager).toContain("'change-password':");
    expect(manager).toContain("'setup-two-factor':");
    expect(password).toContain('useChangePassword');
    expect(password).toContain('Email address');
    expect(twoFactor).toContain('qr_code');
    expect(twoFactor).toContain('setupData.secret');
    expect(twoFactor).toContain('handleVerify');
  });

  test('keeps Change Password fields visible above the Android keyboard', async () => {
    const manager = await Bun.file(
      new URL('../../components/sheets/SheetManager.tsx', import.meta.url),
    ).text();
    const password = await Bun.file(
      new URL('../../components/sheets/ChangePasswordSheet.tsx', import.meta.url),
    ).text();
    const passwordInput = await Bun.file(
      new URL('../../components/ui/PasswordInput.tsx', import.meta.url),
    ).text();
    const rootLayout = await Bun.file(
      new URL('../../../app/_layout.tsx', import.meta.url),
    ).text();

    expect(password).toContain('BottomSheetTextInput');
    expect(password.match(/InputComponent=\{BottomSheetTextInput\}/g)).toHaveLength(4);
    expect(password).not.toContain('KeyboardAvoidingView');
    expect(password).toContain('KeyboardAwareScrollView');
    expect(password).toContain('bottomOffset={24}');
    expect(password).toContain('ScrollViewComponent={BottomSheetScrollViewComponent}');
    expect(password).toContain('onFocus={expandSheet}');
    expect(password).toContain("Keyboard.addListener('keyboardDidHide', collapseSheet)");
    expect(passwordInput).toContain('InputComponent?:');
    expect(manager).toMatch(
      /'change-password':\s*\{[^}]*snapPoints:\s*\['100%'\][^}]*dynamic:\s*true[^}]*keyboardBehavior:\s*'interactive'/,
    );
    expect(manager).toContain('modalRef.current?.expand()');
    expect(manager).toContain('modalRef.current?.snapToIndex(0)');
    expect(manager).toContain('collapseSheet={collapseSheet}');
    expect(manager).toContain(
      'android_keyboardInputMode={config?.androidKeyboardInputMode ??',
    );
    expect(rootLayout).toContain('KeyboardProvider');
  });
});
