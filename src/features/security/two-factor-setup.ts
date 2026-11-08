export interface TwoFactorSetupData {
  qr_code?: string;
  secret?: string;
}

/**
 * GET /users/2fa/setup returns `{ qrcode, secret }` (see web setup-2fa.tsx).
 * Accept `qr_code` too so an older or adapted payload still shows the QR.
 */
export function normalizeTwoFactorSetup(data: unknown): TwoFactorSetupData | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as { qrcode?: unknown; qr_code?: unknown; secret?: unknown };
  const qr = typeof raw.qrcode === 'string' ? raw.qrcode : typeof raw.qr_code === 'string' ? raw.qr_code : undefined;
  const secret = typeof raw.secret === 'string' ? raw.secret : undefined;
  if (!qr && !secret) return null;
  return { qr_code: qr, secret };
}

/** Keep digits only, capped at the 6-digit TOTP length. */
export function sanitizeTotpCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6);
}
