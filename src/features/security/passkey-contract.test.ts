// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('native passkey contracts', () => {
  test('uses every existing passkey endpoint and invalidates the passkey list', async () => {
    const query = await Bun.file(
      new URL('../../hooks/queries/use-passkeys.ts', import.meta.url),
    ).text();
    const mutations = await Bun.file(
      new URL('../../hooks/mutations/use-passkey-mutations.ts', import.meta.url),
    ).text();

    expect(query).toContain('endpoint.listPasskeys');
    expect(mutations).toContain('endpoint.passkeyRegisterBegin');
    expect(mutations).toContain('Passkey.create');
    expect(mutations).toContain('endpoint.passkeyRegisterComplete');
    expect(mutations).toContain("endpoint.deletePasskey.replace(':credential_id'");
    expect(mutations).toContain('queryKeys.passkeys');
  });

  test('removes fallback credentials only after native registration completes', async () => {
    const mutations = await Bun.file(
      new URL('../../hooks/mutations/use-passkey-mutations.ts', import.meta.url),
    ).text();

    const completeIndex = mutations.indexOf('endpoint.passkeyRegisterComplete');
    const cleanupIndex = mutations.indexOf('storageKeys.biometricsRefreshToken');

    expect(completeIndex).toBeGreaterThan(-1);
    expect(cleanupIndex).toBeGreaterThan(completeIndex);
    expect(mutations).toContain('storageKeys.passkeyCredentialId');
  });
});
