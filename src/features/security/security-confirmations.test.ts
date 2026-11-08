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
    const twoFactorLogic = await Bun.file(
      new URL('../../hooks/use-two-factor-settings-logic.ts', import.meta.url),
    ).text();
    const accountLogic = await Bun.file(
      new URL('../../hooks/use-account-settings-logic.ts', import.meta.url),
    ).text();
    const settings = await Bun.file(
      new URL('../../../app/settings/index.tsx', import.meta.url),
    ).text();

    expect(manager).toContain("import { SecurityConfirmationSheet }");
    expect(manager).toContain("'security-confirmation':");
    expect(sheet).toContain("'delete-passkey'");
    expect(sheet).toContain("'delete-memory'");
    expect(sheet).toContain("'disable-two-factor'");
    expect(sheet).toContain("'logout-all-devices'");
    expect(sheet).toContain("'logout-current-device'");
    expect(sheet).toContain('Session revocation is not available yet');
    expect(sheet).toContain('Keep the sheet open when an async confirmation fails');
    expect(twoFactorLogic).toContain("kind: 'disable-two-factor'");
    expect(twoFactorLogic).not.toContain('Alert.alert(');
    // Account deletion has its own flow (app/settings/delete-account.tsx), not a one-tap confirmation.
    expect(accountLogic).not.toContain("kind: 'delete-account'");
    expect(accountLogic).not.toContain('Alert.alert(');
    expect(settings).toContain("kind: 'logout-current-device'");
  });

  test('uses sheet confirmation for story deletion instead of a native alert', async () => {
    const storyLogic = await Bun.file(
      new URL('../../hooks/use-story-detail-logic.ts', import.meta.url),
    ).text();

    expect(storyLogic).toContain("kind: 'delete-memory'");
    expect(storyLogic).not.toContain('Alert.alert(');
  });
});
