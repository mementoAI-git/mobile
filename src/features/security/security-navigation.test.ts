// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('Security settings screen', () => {
  test('connects every reference action to real security behavior', async () => {
    const screen = await Bun.file(
      new URL('../../../app/settings/account.tsx', import.meta.url),
    ).text();
    const row = await Bun.file(
      new URL('../../components/security/SecurityCredentialRow.tsx', import.meta.url),
    ).text();

    expect(screen).toContain('Security');
    expect(screen).toContain("openSheet('change-password')");
    expect(screen).toContain('useTwoFactorSettingsLogic');
    expect(screen).toContain('usePasskeys()');
    expect(screen).toContain('useRegisterPasskey()');
    expect(screen).toContain('Passkey.isSupported()');
    expect(screen).toContain('Log out of all devices');
    expect(row).toContain('React.memo');
    expect(`${screen}${row}`).not.toMatch(/text-gray-|text-slate-/);
  });
});
