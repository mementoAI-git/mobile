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
