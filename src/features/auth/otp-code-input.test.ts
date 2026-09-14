import { describe, expect, test } from 'bun:test';
import {
  normalizeOtpInput,
  isCompleteOtp,
  getResendSecondsRemaining,
} from './email-verification';

describe('OtpCodeInput logic and policies', () => {
  test('strips alphabetic and special characters when typing or pasting', () => {
    expect(normalizeOtpInput('12a3-45')).toBe('12345');
    expect(normalizeOtpInput('987 654')).toBe('987654');
    expect(normalizeOtpInput('code: 482910')).toBe('482910');
  });

  test('truncates pasted input longer than 6 digits', () => {
    expect(normalizeOtpInput('123456789')).toBe('123456');
  });

  test('correctly assesses OTP completeness', () => {
    expect(isCompleteOtp('')).toBe(false);
    expect(isCompleteOtp('12345')).toBe(false);
    expect(isCompleteOtp('123456')).toBe(true);
    expect(isCompleteOtp('1234567')).toBe(false);
  });

  test('calculates remaining resend cooldown seconds accurately', () => {
    const now = 100_000;
    // Just sent 5 seconds ago -> 25 seconds left
    expect(getResendSecondsRemaining(now - 5_000, now, 30_000)).toBe(25);
    // Sent 29.5 seconds ago -> 1 second left (ceiling)
    expect(getResendSecondsRemaining(now - 29_500, now, 30_000)).toBe(1);
    // Sent 30 seconds ago -> 0 seconds left
    expect(getResendSecondsRemaining(now - 30_000, now, 30_000)).toBe(0);
    // Sent 40 seconds ago -> 0 seconds left
    expect(getResendSecondsRemaining(now - 40_000, now, 30_000)).toBe(0);
    // Null sentAt -> 0 seconds left
    expect(getResendSecondsRemaining(null, now, 30_000)).toBe(0);
  });
});
