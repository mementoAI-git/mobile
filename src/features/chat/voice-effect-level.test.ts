import { expect, test } from 'bun:test';
import { PlaybackLevelMeter, voiceEffectLevel } from './voice-effect-level';
import { float32ToPcm16Base64 } from './voice-pcm';

test('voice glow stays dark for silent or malformed PCM', () => {
  expect(voiceEffectLevel(float32ToPcm16Base64(new Float32Array(40)))).toBe(0);
  expect(voiceEffectLevel('not base64!')).toBe(0);
  expect(voiceEffectLevel('AA==')).toBe(0);
});
test('voice glow follows audio energy and caps loud audio', () => {
  const level = (value: number) => voiceEffectLevel(float32ToPcm16Base64(new Float32Array(40).fill(value)));
  expect(level(0.05)).toBeGreaterThan(0);
  expect(level(0.1)).toBeGreaterThan(level(0.05));
  expect(level(0.8)).toBe(1);
});

test('playback meter reads the level being heard, not the latest chunk', () => {
  const meter = new PlaybackLevelMeter();
  const chunk = (value: number) => float32ToPcm16Base64(new Float32Array(1200).fill(value)); // 50 ms
  meter.push(chunk(0.02));
  meter.push(chunk(0.1));
  meter.push(chunk(0.02));
  // Nothing played yet: the first window.
  const quiet = meter.level(150);
  expect(quiet).toBeGreaterThan(0);
  // 50 ms played: the loud window.
  expect(meter.level(100)).toBeGreaterThan(quiet);
  // 100 ms played: quiet again.
  expect(meter.level(50)).toBeCloseTo(quiet, 5);
  // Everything played (listening): rest.
  expect(meter.level(0)).toBe(0);
  meter.reset();
  expect(meter.level(0)).toBe(0);
});
