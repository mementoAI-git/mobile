// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('production environment bundling', () => {
  test('uses statically analyzable Expo public environment references', async () => {
    const source = await Bun.file(
      new URL('../../lib/env.ts', import.meta.url),
    ).text();

    expect(source).toContain('process.env.EXPO_PUBLIC_API_BASE_URL');
    expect(source).not.toMatch(/process\.env\s*\[/);
  });
});
