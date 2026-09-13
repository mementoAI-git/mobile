const OTP_LENGTH = 6;
const DEFAULT_RESEND_COOLDOWN_MS = 30_000;

export function normalizeOtpInput(value: string): string {
  return value.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH);
}

export function isCompleteOtp(value: string): boolean {
  return /^[0-9]{6}$/.test(value);
}

export function getResendSecondsRemaining(
  sentAtMs: number | null,
  nowMs: number,
  cooldownMs = DEFAULT_RESEND_COOLDOWN_MS,
): number {
  if (sentAtMs === null) return 0;

  const remainingMs = sentAtMs + cooldownMs - nowMs;
  return Math.max(0, Math.ceil(remainingMs / 1_000));
}
