import { expect, test } from 'bun:test';
import { voiceEffectLevel } from './voice-effect-level';
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
