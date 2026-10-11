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

  test('traces screen navigation and keeps trace headers on the API', async () => {
    const layout = await Bun.file(
      new URL('../../../app/_layout.tsx', import.meta.url),
    ).text();

    expect(layout).toContain('Sentry.reactNavigationIntegration(');
    expect(layout).toContain('integrations: [navigationIntegration]');
    expect(layout).toContain('navigationIntegration.registerNavigationContainer(navigationRef)');
    expect(layout).toContain('tracePropagationTargets: tracePropagationTargetsFor(API_BASE_URL)');
    expect(layout).toContain('environment: SENTRY_ENVIRONMENT');
  });

  test('gives every EAS profile its own Sentry environment and store builds a DSN', async () => {
    const eas = await Bun.file(new URL('../../../eas.json', import.meta.url)).json();
    const env = await Bun.file(new URL('../../lib/env.ts', import.meta.url)).text();
    const profiles = eas.build;

    expect(env).toContain('process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT');
    const environments = Object.values(profiles).map(
      (profile) => profile.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT,
    );
    expect(environments.every(Boolean)).toBe(true);
    expect(new Set(environments).size).toBe(environments.length);
    expect(profiles.production.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT).toBe('production');
    // Store builds bundle JS on EAS, which never sees the gitignored .env.
    for (const name of ['preview', 'testflight', 'production']) {
      expect(profiles[name].env.EXPO_PUBLIC_SENTRY_DSN).toMatch(/^https:\/\//);
    }
    // The installable Android test build inherits preview's DSN and API.
    expect(profiles.apk).toMatchObject({
      extends: 'preview',
      distribution: 'internal',
      android: { buildType: 'apk' },
    });
  });

  test('reports startup to Expo Observe once the app is usable', async () => {
    const layout = await Bun.file(
      new URL('../../../app/_layout.tsx', import.meta.url),
    ).text();

    expect(layout).toContain("from 'expo-observe'");
    expect(layout).toContain('const { markInteractive } = useObserve();');
    // Interactive means ready to use, not just the native splash hidden:
    // the animated splash must be gone too.
    expect(layout).toContain('if (!appReady || showAnimatedSplash || markedInteractiveRef.current) return;');
    expect(layout).toMatch(/export default ObserveRoot\.wrap\(/);
    const hooks = layout.indexOf('useObserve()');
    const earlyReturn = layout.indexOf('if (!hydrated || !fontsLoaded || hasSeenSplash === null)');
    expect(hooks).toBeGreaterThan(-1);
    expect(hooks).toBeLessThan(earlyReturn);
  });
});
