// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const files = [
  'app/(auth)/login.tsx',
  'app/(auth)/verify-email.tsx',
  'app/(auth)/forgot-password.tsx',
  'app/(auth)/set-password.tsx',
  'app/(auth)/oauth-callback.tsx',
  'app/(auth)/two-factor.tsx',
  'app/accept-invite/[id].tsx',
  'app/settings/account.tsx',
  'app/settings/feedback.tsx',
  'app/settings/index.tsx',
  'app/settings/two-factor.tsx',
  'src/components/sheets/SecurityConfirmationSheet.tsx',
  'src/components/sheets/SetupTwoFactorSheet.tsx',
  'src/hooks/use-two-factor-settings-logic.ts',
].map((file) => readFileSync(file, 'utf8')).join('\n');

describe('Apple-like operational copy', () => {
  test('uses sign-in and log-out terminology consistently', () => {
    for (const phrase of ['Please login', 'Back to login', 'Go to Sign In', 'Sign In to Accept', 'Yes, logout', 'login afresh']) {
      expect(files).not.toContain(phrase);
    }
  });

  test('uses concise security and status language', () => {
    for (const phrase of ['Are you sure you want to', 'Setup 2FA', 'Setup Authenticator', 'Failed to setup 2FA', 'Invalid token', 'Compatibility fallback—not a passkey', 'Thank you—']) {
      expect(files).not.toContain(phrase);
    }
  });
});

