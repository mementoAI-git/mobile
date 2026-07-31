// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('Security confirmations', () => {
  test('registers every destructive confirmation without inventing an all-device endpoint', async () => {
    const manager = await Bun.file(
      new URL('../../components/sheets/SheetManager.tsx', import.meta.url),
    ).text();
    const sheet = await Bun.file(
      new URL('../../components/sheets/SecurityConfirmationSheet.tsx', import.meta.url),
    ).text();
    const settings = await Bun.file(
      new URL('../../../app/settings/index.tsx', import.meta.url),
    ).text();

    expect(manager).toContain("import { SecurityConfirmationSheet }");
    expect(manager).toContain("'security-confirmation':");
    expect(sheet).toContain("'delete-passkey'");
    expect(sheet).toContain("'disable-two-factor'");
    expect(sheet).toContain("'logout-all-devices'");
    expect(sheet).toContain("'logout-current-device'");
    expect(sheet).toContain('Session revocation is not available yet');
    expect(settings).toContain("kind: 'logout-current-device'");
  });
});
