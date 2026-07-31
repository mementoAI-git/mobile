// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('passkey-first login', () => {
  test('uses the native assertion ceremony before the existing biometric fallback', async () => {
    const logic = await Bun.file(
      new URL('../../hooks/use-login-logic.ts', import.meta.url),
    ).text();
    const screen = await Bun.file(
      new URL('../../../app/(auth)/login.tsx', import.meta.url),
    ).text();

    expect(logic).toContain('endpoint.passkeyLoginBegin');
    expect(logic).toContain('Passkey.get');
    expect(logic).toContain('endpoint.passkeyLoginComplete');
    expect(logic).toContain('storageKeys.passkeyCredentialId');
    expect(logic).toContain('storageKeys.biometricsRefreshToken');
    expect(logic).toContain('selectSecurityLoginMethod');
    expect(screen).toContain('{securityLoginLabel}');
  });
});
