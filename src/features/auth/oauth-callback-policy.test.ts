// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';

const source = (path: string) => readFileSync(join(import.meta.dir, '../../..', path), 'utf8');

describe('sign-in links into the app', () => {
  test('the oauth-callback link can never sign the app in', () => {
    // Any app or page could open memento://oauth-callback?access_token=… or
    // ?code=…, and nothing ties such a link to a sign-in the member started.
    const screen = source('app/(auth)/oauth-callback.tsx');
    expect(screen).not.toMatch(/access_token|establishSession|restoreSessionWithCredentials|code\b.*fetch/s);
    expect(screen).toContain('Redirect');
  });

  test('Google and Apple sign-in never fall back to a browser that cannot return', () => {
    for (const path of ['src/hooks/use-login-logic.ts', 'app/(auth)/register.tsx']) {
      const file = source(path);
      expect(file).not.toContain('openAuthSessionAsync');
      expect(file).not.toContain('oauthCallbackUrl');
    }
  });
});
