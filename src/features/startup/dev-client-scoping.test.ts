import { describe, expect, test } from 'bun:test';

const loadConfig = (profile: string | undefined) => {
  const prev = process.env.EAS_BUILD_PROFILE;
  if (profile === undefined) delete process.env.EAS_BUILD_PROFILE;
  else process.env.EAS_BUILD_PROFILE = profile;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('../../../app.config.js');
  const base = JSON.parse(JSON.stringify(require('../../../app.json').expo));
  const out = mod({ config: base });
  if (prev === undefined) delete process.env.EAS_BUILD_PROFILE;
  else process.env.EAS_BUILD_PROFILE = prev;
  return out;
};

const hasDevClient = (cfg: { plugins?: unknown[] }) =>
  (cfg.plugins ?? []).some((p) => (Array.isArray(p) ? p[0] : p) === 'expo-dev-client');

describe('expo-dev-client scoping', () => {
  test('stays in dev / local builds', () => {
    expect(hasDevClient(loadConfig(undefined))).toBe(true);
    expect(hasDevClient(loadConfig('development'))).toBe(true);
  });

  test('is stripped from store builds', () => {
    for (const profile of ['preview', 'testflight', 'production']) {
      const cfg = loadConfig(profile);
      expect(hasDevClient(cfg)).toBe(false);
      // Live Activities + other plugins untouched
      expect(cfg.plugins).toContain('@bacons/apple-targets');
      expect(cfg.plugins).toContain('./plugins/with-audio-api-ffmpeg-disabled');
    }
  });
});
