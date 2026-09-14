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

  test('disables Sentry replay sampling to reduce app overhead and battery drain', async () => {
    const layout = await Bun.file(
      new URL('../../../app/_layout.tsx', import.meta.url),
    ).text();
    const app = await Bun.file(
      new URL('../../../App.tsx', import.meta.url),
    ).text();

    expect(layout).toContain('replaysSessionSampleRate: 0');
    expect(layout).toContain('replaysOnErrorSampleRate: 0');
    expect(layout).not.toContain('mobileReplayIntegration()');
    expect(app).toContain('replaysSessionSampleRate: 0');
    expect(app).toContain('replaysOnErrorSampleRate: 0');
    expect(app).toContain('sendDefaultPii: false');
    expect(app).not.toContain('ingest.sentry.io');
  });
});
