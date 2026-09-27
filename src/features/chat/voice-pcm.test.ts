import { describe, expect, test } from 'bun:test';

import { float32ToPcm16Base64, pcm16Base64ToFloat32 } from './voice-pcm';

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
});
