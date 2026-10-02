import { describe, expect, test } from 'bun:test';

const read = (path: string) => Bun.file(new URL(`../../../${path}`, import.meta.url)).text();

describe('sign-in and create-account screens', () => {
  // A signed-out user has nowhere to close to: onboarding sends them straight
  // back to sign-in, so the X only looped.
  test('have no close button', async () => {
    for (const screen of ['app/(auth)/login.tsx', 'app/(auth)/register.tsx']) {
      const source = await read(screen);
      expect(source).not.toContain('accessibilityLabel="Close"');
      expect(source).not.toContain('accessibilityLabel="Close and return to sign in"');
    }
  });
});
