import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('developer routes', () => {
  test('the splash preview redirects away outside development builds', () => {
    const screen = readFileSync('app/splash-preview.tsx', 'utf8');
    expect(screen).toContain('if (!__DEV__) return <Redirect href="/" />;');
  });
});
