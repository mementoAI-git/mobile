import { describe, expect, test } from 'bun:test';
import {
  CINEMATIC_SPLASH,
  CINEMATIC_SPLASH_CARDS,
  CINEMATIC_SPLASH_PARTICLES,
  CINEMATIC_SPLASH_WORDS,
  cinematicSplashAssetNames,
} from './cinematic-splash';

describe('cinematic startup splash', () => {
  test('preserves the source animation timeline without account CTA beats', () => {
    expect(CINEMATIC_SPLASH.duration).toBe(8_000);
    expect(CINEMATIC_SPLASH_CARDS.map((card) => card.start)).toEqual([
      1_280,
      1_880,
      2_480,
      3_080,
    ]);
    expect(CINEMATIC_SPLASH_WORDS.map((word) => word.start)).toEqual([
      5_150,
      5_280,
      5_400,
      5_580,
      5_820,
      6_080,
    ]);
    expect(CINEMATIC_SPLASH.facesStart).toBe(6_350);
  });

  test('keeps the source particle field and all required bundled artwork', () => {
    expect(CINEMATIC_SPLASH_PARTICLES).toHaveLength(14);
    expect(cinematicSplashAssetNames()).toEqual([
      'journal.webp',
      'hug.webp',
      'typewriter.webp',
      'phone.webp',
      'avatar-1.webp',
      'avatar-2.webp',
      'avatar-3.webp',
    ]);
  });

  test('finishes with a short fade rather than a persistent acquisition screen', () => {
    expect(CINEMATIC_SPLASH.exitStart + CINEMATIC_SPLASH.exitDuration).toBe(
      CINEMATIC_SPLASH.duration,
    );
  });

  test('is wired as a routing-neutral startup overlay with no account calls to action', async () => {
    const [component, layout, appConfig] = await Promise.all([
      Bun.file(
        new URL('../../components/system/AnimatedSplash.tsx', import.meta.url),
      ).text(),
      Bun.file(new URL('../../../app/_layout.tsx', import.meta.url)).text(),
      Bun.file(new URL('../../../app.json', import.meta.url)).text(),
    ]);

    expect(component).toContain('<StatusBar hidden animated />');
    expect(component).toContain('runOnJS(finish)()');
    expect(component).toContain('onLayout={handleLayout}');
    expect(component).toContain('if (!nativeSplashHidden || reduceMotion === null) return;');
    expect(component).toContain("'worklet';");
    expect(component).not.toContain('const RISE');
    expect(component).not.toContain('Create an account');
    expect(component).not.toContain('I already have an account');
    expect(component).not.toMatch(/useRouter|router\.|navigate\(/);

    for (const asset of cinematicSplashAssetNames()) {
      expect(layout).toContain(`splash-cinematic/${asset}`);
    }
    expect(layout).toContain('<AnimatedSplash');
    expect(layout).toContain('onReady={hideNativeSplash}');
    expect(layout).toContain('replaySpeed={hasSeenSplash === true ? 6 : 1}');
    expect(layout.match(/SplashScreen\.hideAsync\(\)/g)).toHaveLength(1);
    expect(layout).toContain('setShowAnimatedSplash(false)');

    const config = JSON.parse(appConfig);
    const splashPlugin = config.expo.plugins.find(
      (plugin: unknown) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen',
    );
    expect(splashPlugin).toEqual([
      'expo-splash-screen',
      {
        backgroundColor: '#FFFFFF',
      },
    ]);
    expect(appConfig).not.toContain('splash-icon.jpg');
  });

  test('derives card positions and clamps oversized elements across compact, reference, and tablet viewports', () => {
    const viewports = [
      { name: 'compact', width: 320, height: 568 },
      { name: 'reference', width: 393, height: 852 },
      { name: 'tablet', width: 768, height: 1024 },
    ];

    for (const vp of viewports) {
      for (const card of CINEMATIC_SPLASH_CARDS) {
        const top = vp.height * card.top;
        const left = vp.width * card.left;
        const width = Math.min(vp.width * card.width, 320);

        expect(top).toBeGreaterThan(0);
        expect(top).toBeLessThan(vp.height);
        expect(width).toBeGreaterThanOrEqual(100);
        expect(width).toBeLessThanOrEqual(320);
      }
    }
  });
});