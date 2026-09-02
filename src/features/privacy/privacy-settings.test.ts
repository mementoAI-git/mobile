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

  test('keeps future privacy actions visibly unavailable', () => {
    expect(screen).toContain('Export your information');
    expect(screen).toContain('Share stories');
    expect(screen.match(/<ComingSoonRow/g)?.length).toBe(2);
  });

  test('uses the real deletion mutation through a styled confirmation', () => {
    expect(screen).toContain('useDeleteAccount');
    expect(screen).toContain("kind: 'delete-account'");
    expect(confirmation).toContain("| 'delete-account'");
    expect(confirmation).toContain('Your access ends immediately');
    expect(confirmation).toContain('finish in the background');
    expect(confirmation).toContain('without a link to your profile');
    expect(screen).not.toContain('Alert.alert(');
  });
});
