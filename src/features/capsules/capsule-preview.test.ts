// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import dayjs from 'dayjs';
import {
  formatUnlockCountdown,
  formatRecipientSummary,
} from './capsule-preview';

describe('capsule recipient preview helpers', () => {
  test('formats recipient summary count into clear copy', () => {
    expect(formatRecipientSummary(0)).toBe('No recipients added yet');
    expect(formatRecipientSummary(1)).toBe('Delivered to 1 recipient upon unlock');
    expect(formatRecipientSummary(3)).toBe('Delivered to 3 recipients upon unlock');
  });

  test('formats countdown intervals accurately', () => {
    const inFiveDays = dayjs().add(5, 'day').toDate();
    expect(formatUnlockCountdown(inFiveDays)).toContain('days');

    const nextYear = dayjs().add(2, 'year').toDate();
    expect(formatUnlockCountdown(nextYear)).toContain('year');

    const past = dayjs().subtract(1, 'day').toDate();
    expect(formatUnlockCountdown(past)).toBe('Unlocked now');
  });

  test('handles invalid date strings gracefully', () => {
    expect(formatUnlockCountdown('invalid-date')).toBe('Unlock date pending');
  });
});
