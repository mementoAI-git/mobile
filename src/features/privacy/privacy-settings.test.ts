// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const screen = readFileSync('app/settings/privacy.tsx', 'utf8');
const confirmation = readFileSync('src/components/sheets/SecurityConfirmationSheet.tsx', 'utf8');

describe('Privacy settings screen', () => {
  test('opens the existing terms and privacy destinations', () => {
    expect(screen).toContain('PRIVACY_URL');
    expect(screen).toContain('TERMS_URL');
    expect(screen).toContain('Linking.openURL');
  });

  test('wires the complete server archive without unfinished actions', () => {
    expect(screen).toContain('Export your archive');
    expect(screen).toContain("'export-archive'");
    expect(screen).not.toContain('Share stories');
    expect(screen).not.toContain('ComingSoonRow');
  });

  test('opens the delete account flow, which uses the real deletion mutation', () => {
    const flow = require('node:fs').readFileSync('app/settings/delete-account.tsx', 'utf8');
    expect(screen).toContain("router.push('/settings/delete-account'");
    expect(flow).toContain('useDeleteAccount');
    expect(screen).not.toContain('Alert.alert(');
  });
});
