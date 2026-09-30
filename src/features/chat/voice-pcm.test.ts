import { describe, expect, test } from 'bun:test';

import {
  calculatePeakAmplitude,
  calculateRmsEnergy,
  float32ToPcm16Base64,
  isBargeInSpeech,
  pcm16Base64ToFloat32,
  resampleLinear,
} from './voice-pcm';

const decodeBytes = (value: string) =>
  Array.from(Uint8Array.from(atob(value), (character) => character.charCodeAt(0)));

describe('voice PCM conversion', () => {
  test('clips Float32 samples and writes signed little-endian PCM16', () => {
    const encoded = float32ToPcm16Base64(
      Float32Array.from([-2, -1, -0.5, 0, 0.5, 1, 2]),
    );

    expect(decodeBytes(encoded)).toEqual([
      0x00, 0x80, 0x00, 0x80, 0x00, 0xc0, 0x00, 0x00, 0xff, 0x3f, 0xff, 0x7f,
      0xff, 0x7f,
    ]);
  });

  test('decodes signed PCM16 to normalized Float32 samples', () => {
    const result = pcm16Base64ToFloat32('AID/PwAA');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Array.from(result.samples)).toEqual([-1, 16383 / 32768, 0]);
    }
  });

  test('rejects odd byte payloads without constructing invalid samples', () => {
    expect(pcm16Base64ToFloat32('AQID')).toEqual({
      ok: false,
      reason: 'odd-byte-length',
    });
  });

  test('resamples model PCM to the playback context rate while preserving duration', () => {
    const source = Float32Array.from([0, 1, 0, -1]);
    const output = resampleLinear(source, 24_000, 48_000);

    expect(output).toHaveLength(8);
    expect(Array.from(output)).toEqual([0, 0.5, 1, 0.5, 0, -0.5, -1, -1]);
    expect(output.length / 48_000).toBe(source.length / 24_000);
  });

  test('copies matching-rate PCM and rejects invalid sample rates', () => {
    const source = Float32Array.from([0.25, -0.25]);
    const output = resampleLinear(source, 48_000, 48_000);

    expect(output).not.toBe(source);
    expect(Array.from(output)).toEqual(Array.from(source));
    expect(() => resampleLinear(source, 0, 48_000)).toThrow();
  });

  test('calculates RMS energy and peak amplitude accurately', () => {
    expect(calculateRmsEnergy(new Float32Array([]))).toBe(0);
    expect(calculatePeakAmplitude(new Float32Array([]))).toBe(0);

    const dcSamples = new Float32Array([0.5, 0.5, 0.5, 0.5]);
    expect(calculateRmsEnergy(dcSamples)).toBeCloseTo(0.5, 5);
    expect(calculatePeakAmplitude(dcSamples)).toBe(0.5);

    const alternating = new Float32Array([-0.8, 0.8, -0.8, 0.8]);
    expect(calculateRmsEnergy(alternating)).toBeCloseTo(0.8, 5);
    expect(calculatePeakAmplitude(alternating)).toBeCloseTo(0.8, 5);
  });

  test('detects intentional speech barge-in vs speaker echo leak', () => {
    // Quiet noise floor / attenuated echo
    const quietEcho = new Float32Array([0.01, -0.02, 0.015, -0.01]);
    expect(isBargeInSpeech(quietEcho)).toBe(false);

    // Moderate residual echo (RMS ~ 0.03, peak ~ 0.07)
    const residualEcho = new Float32Array(100).fill(0.03);
    expect(isBargeInSpeech(residualEcho)).toBe(false);

    // Intentional speech: high RMS + peak
    const speech = new Float32Array([0.15, -0.22, 0.18, -0.12]);
    expect(isBargeInSpeech(speech)).toBe(true);

    // Confident speech (high RMS)
    const loudSpeech = new Float32Array(100).fill(0.08);
    expect(isBargeInSpeech(loudSpeech)).toBe(true);
  });
});

