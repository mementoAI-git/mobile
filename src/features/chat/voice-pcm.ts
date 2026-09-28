const BASE64_CHUNK_BYTES = 0x6000;

function bytesToBase64(bytes: Uint8Array): string {
  const parts: string[] = [];

  for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK_BYTES) {
    const end = Math.min(offset + BASE64_CHUNK_BYTES, bytes.length);
    let binary = '';
    for (let index = offset; index < end; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }
    parts.push(btoa(binary));
  }

  return parts.join('');
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function float32ToPcm16Base64(samples: Float32Array): string {
  const bytes = new Uint8Array(samples.length * 2);
  const view = new DataView(bytes.buffer);

  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    const pcm = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(index * 2, pcm, true);
  }

  return bytesToBase64(bytes);
}

export type Pcm16DecodeResult =
  | { ok: true; samples: Float32Array }
  | { ok: false; reason: 'odd-byte-length' };

export function pcm16Base64ToFloat32(value: string): Pcm16DecodeResult {
  const bytes = base64ToBytes(value);
  if (bytes.byteLength % 2 !== 0) {
    return { ok: false, reason: 'odd-byte-length' };
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const samples = new Float32Array(bytes.byteLength / 2);
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = view.getInt16(index * 2, true) / 32768;
  }

  return { ok: true, samples };
}

export function calculateRmsEnergy(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sumSquares = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index];
    sumSquares += sample * sample;
  }
  return Math.sqrt(sumSquares / samples.length);
}

export function calculatePeakAmplitude(samples: Float32Array): number {
  let peak = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const abs = Math.abs(samples[index]);
    if (abs > peak) peak = abs;
  }
  return peak;
}

export const BARGE_IN_THRESHOLDS = {
  minRmsEnergy: 0.055,
  minPeakAmplitude: 0.12,
  confidentRmsEnergy: 0.075,
  instantRmsEnergy: 0.14,
} as const;

export function isBargeInSpeech(
  samples: Float32Array,
  thresholds: {
    minRmsEnergy?: number;
    minPeakAmplitude?: number;
    confidentRmsEnergy?: number;
  } = {},
): boolean {
  if (samples.length === 0) return false;
  const minRms = thresholds.minRmsEnergy ?? BARGE_IN_THRESHOLDS.minRmsEnergy;
  const minPeak = thresholds.minPeakAmplitude ?? BARGE_IN_THRESHOLDS.minPeakAmplitude;
  const confidentRms =
    thresholds.confidentRmsEnergy ?? BARGE_IN_THRESHOLDS.confidentRmsEnergy;

  const rms = calculateRmsEnergy(samples);
  if (rms >= confidentRms) return true;
  const peak = calculatePeakAmplitude(samples);
  return rms >= minRms && peak >= minPeak;
}

