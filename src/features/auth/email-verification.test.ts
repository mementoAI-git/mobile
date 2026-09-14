import { describe, expect, test } from 'bun:test';
import {
  getResendSecondsRemaining,
  isCompleteOtp,
  normalizeOtpInput,
} from './email-verification';

describe('email verification OTP policy', () => {
  test('keeps digits while stripping spaces and noise', () => {
    expect(normalizeOtpInput('23a 21-44')).toBe('232144');
  });

  test('rejects Unicode digits and other non-ASCII input', () => {
    expect(normalizeOtpInput('１２３٤٥٦abc')).toBe('');
  });

  test('truncates input to six characters', () => {
    expect(normalizeOtpInput('1234567')).toBe('123456');
  });

  test('recognizes exactly six digits as complete', () => {
    expect(isCompleteOtp('123456')).toBe(true);
    expect(isCompleteOtp('12345')).toBe(false);
    expect(isCompleteOtp('1234567')).toBe(false);
    expect(isCompleteOtp('12345a')).toBe(false);
  });

  test('returns remaining seconds during the 30-second resend cooldown', () => {
    expect(getResendSecondsRemaining(1_000, 16_000, 30_000)).toBe(15);
  });

  test('returns zero when no resend cooldown is active', () => {
    expect(getResendSecondsRemaining(null, 16_000)).toBe(0);
    expect(getResendSecondsRemaining(1_000, 31_000, 30_000)).toBe(0);
  });
});
