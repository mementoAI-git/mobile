import { describe, expect, test } from 'bun:test';

import {
  calculateHarmonicity,
  calculateVoiceBandRatio,
  calculateZeroCrossingRate,
  VoiceActivityDetector,
} from './voice-vad';

function generateSineWave(
  frequencyHz: number,
  sampleRate: number,
  durationSamples: number,
  amplitude: number,
): Float32Array {
  const samples = new Float32Array(durationSamples);
  for (let index = 0; index < durationSamples; index += 1) {
    samples[index] = amplitude * Math.sin((2 * Math.PI * frequencyHz * index) / sampleRate);
  }
  return samples;
}

function generateWhiteNoise(durationSamples: number, amplitude: number): Float32Array {
  const samples = new Float32Array(durationSamples);
  for (let index = 0; index < durationSamples; index += 1) {
    samples[index] = (Math.random() * 2 - 1) * amplitude;
  }
  return samples;
}

describe('VoiceActivityDetector (Micro-VAD)', () => {
  test('accurately calculates Zero-Crossing Rate (ZCR)', () => {
    expect(calculateZeroCrossingRate(new Float32Array([]))).toBe(0);
    expect(calculateZeroCrossingRate(new Float32Array([0.5]))).toBe(0);

    // Constant DC has 0 crossings
    expect(calculateZeroCrossingRate(new Float32Array([0.1, 0.2, 0.3]))).toBe(0);

    // Alternating + - has maximum crossings
    const alternating = new Float32Array([1, -1, 1, -1, 1]);
    expect(calculateZeroCrossingRate(alternating)).toBe(1.0);
  });

  test('detects harmonic pitch in human vocal range (80Hz - 355Hz)', () => {
    // 200 Hz pitch (typical female/male fundamental frequency)
    const voicePitch = generateSineWave(200, 16_000, 800, 0.2);
    const harmonicity = calculateHarmonicity(voicePitch, 16_000);
    expect(harmonicity).toBeGreaterThan(0.8);

    // White noise has low harmonicity
    const noise = generateWhiteNoise(800, 0.2);
    const noiseHarmonicity = calculateHarmonicity(noise, 16_000);
    expect(noiseHarmonicity).toBeLessThan(0.4);
  });

  test('concentrates energy in the human voice band (300Hz - 3300Hz)', () => {
    // 1000 Hz formants tone in human speech band
    const voiceTone = generateSineWave(1000, 16_000, 800, 0.2);
    const voiceBandRatio = calculateVoiceBandRatio(voiceTone);
    expect(voiceBandRatio).toBeGreaterThan(0.7);

    // 40 Hz low-frequency mechanical rumble
    const rumble = generateSineWave(40, 16_000, 800, 0.2);
    const rumbleRatio = calculateVoiceBandRatio(rumble);
    expect(rumbleRatio).toBeLessThan(0.2);
  });

  test('scores human vocal synthesis with high speech probability', () => {
    const vad = new VoiceActivityDetector();

    // Voice simulation: 200Hz fundamental + 800Hz formant
    const speech = new Float32Array(800);
    for (let index = 0; index < 800; index += 1) {
      speech[index] =
        0.12 * Math.sin((2 * Math.PI * 200 * index) / 16_000) +
        0.08 * Math.sin((2 * Math.PI * 800 * index) / 16_000);
    }

    const result = vad.processFrame(speech);
    expect(result.isSpeech).toBe(true);
    expect(result.probability).toBeGreaterThan(0.6);
  });

  test('rejects low-energy silence and background noise', () => {
    const vad = new VoiceActivityDetector();

    // Near silence
    const silence = new Float32Array(800).fill(0.005);
    const silenceResult = vad.processFrame(silence);
    expect(silenceResult.isSpeech).toBe(false);
    expect(silenceResult.probability).toBeLessThan(0.3);

    // Diffuse low-level white noise
    const noise = generateWhiteNoise(800, 0.02);
    const noiseResult = vad.processFrame(noise);
    expect(noiseResult.isSpeech).toBe(false);
  });

});
