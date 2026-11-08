import { describe, expect, test } from 'bun:test';
import { normalizeTwoFactorSetup, sanitizeTotpCode } from './two-factor-setup';

describe('two-factor setup payload', () => {
  test('reads the web API shape (qrcode)', () => {
    expect(normalizeTwoFactorSetup({ qrcode: 'data:image/png;base64,AAA', secret: 'ABC' }))
      .toEqual({ qr_code: 'data:image/png;base64,AAA', secret: 'ABC' });
  });

  test('also accepts qr_code', () => {
    expect(normalizeTwoFactorSetup({ qr_code: 'q', secret: 's' })).toEqual({ qr_code: 'q', secret: 's' });
  });

  test('rejects empty payloads', () => {
    expect(normalizeTwoFactorSetup(null)).toBeNull();
    expect(normalizeTwoFactorSetup({})).toBeNull();
  });

  test('sanitizes pasted codes', () => {
    expect(sanitizeTotpCode(' 123 456\n')).toBe('123456');
    expect(sanitizeTotpCode('12345678')).toBe('123456');
  });
});

describe('two-factor setup request', () => {
  test('fetches setup with GET like web', async () => {
    const logic = await Bun.file(new URL('../../hooks/use-two-factor-settings-logic.ts', import.meta.url)).text();
    expect(logic).toContain('get<unknown>(endpoint.setup2FA)');
    expect(logic).toContain('normalizeTwoFactorSetup');
  });
});
