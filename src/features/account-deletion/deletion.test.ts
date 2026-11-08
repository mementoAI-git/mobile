import { describe, expect, test } from 'bun:test';
import { buildDeleteAccountPayload, deletionReasonLabel, isDeletionConfirmed, maskEmail } from './deletion';

describe('account deletion', () => {
  test('requires the exact confirmation word', () => {
    expect(isDeletionConfirmed('DELETE')).toBe(true);
    expect(isDeletionConfirmed('  DELETE ')).toBe(true);
    expect(isDeletionConfirmed('delete')).toBe(false);
    expect(isDeletionConfirmed('DELET')).toBe(false);
  });

  test('labels the chosen reason, defaulting to No reason', () => {
    expect(deletionReasonLabel(null)).toBe('No reason');
    expect(deletionReasonLabel('taking-break')).toBe('I’m taking a break');
  });

  test('masks the email like the design', () => {
    expect(maskEmail('grootxyz@gmail.com')).toBe('groot***gmail.com');
    expect(maskEmail('ab@x.io')).toBe('a***x.io');
    expect(maskEmail(undefined)).toBe('');
  });

  test('sends details only for Something else', () => {
    expect(buildDeleteAccountPayload({ reason: 'other', details: ' too slow ', exportData: true }))
      .toEqual({ reason: 'other', details: 'too slow', export_data: true });
    expect(buildDeleteAccountPayload({ reason: 'taking-break', details: 'ignored', exportData: false }))
      .toEqual({ reason: 'taking-break', export_data: false });
    expect(buildDeleteAccountPayload({ reason: null, details: '', exportData: false }))
      .toEqual({ export_data: false });
  });
});

describe('delete account screens', () => {
  const { readFileSync } = require('node:fs');
  const screen = readFileSync('app/settings/delete-account.tsx', 'utf8');
  const privacy = readFileSync('app/settings/privacy.tsx', 'utf8');
  const sheet = readFileSync('src/components/sheets/DeleteAccountReasonSheet.tsx', 'utf8');

  test('Privacy opens the full delete flow instead of a one-tap confirmation', () => {
    expect(privacy).toContain("router.push('/settings/delete-account'");
    expect(privacy).not.toContain("kind: 'delete-account'");
  });

  test('the flow explains, asks why, then needs DELETE typed', () => {
    expect(screen).toContain('Start deletion process');
    expect(screen).toContain('I changed my mind');
    expect(screen).toContain("openSheet('delete-account-reason'");
    expect(screen).toContain('disabled={!confirmed || busy}');
    expect(screen).toContain('Deactivating account');
    expect(screen).toContain('toast(');
    expect(sheet).toContain('Tell us why you’re leaving');
    expect(sheet).toContain('Tell us more');
  });
});
