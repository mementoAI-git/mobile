import { describe, expect, test } from 'bun:test';

import { buildPcm16Wav, VoiceUplinkRecorder } from './voice-uplink-recorder';

const base64Of = (bytes: number[]) => btoa(String.fromCharCode(...bytes));

describe('voice uplink recorder', () => {
  test('builds a 16 kHz mono PCM16 WAV around the samples', () => {
    const wav = buildPcm16Wav(new Uint8Array([1, 0, 2, 0]), 16_000);
    const view = new DataView(wav.buffer);
    const text = (offset: number) => String.fromCharCode(...wav.slice(offset, offset + 4));

    expect(text(0)).toBe('RIFF');
    expect(view.getUint32(4, true)).toBe(36 + 4);
    expect(text(8)).toBe('WAVE');
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(16_000);
    expect(view.getUint16(34, true)).toBe(16);
    expect(text(36)).toBe('data');
    expect(view.getUint32(40, true)).toBe(4);
    expect([...wav.slice(44)]).toEqual([1, 0, 2, 0]);
  });

  test('keeps sent chunks in order and stops at the time cap', () => {
    const recorder = new VoiceUplinkRecorder(0.0002);

    recorder.add(base64Of([1, 2, 3, 4]));
    recorder.add(base64Of([5, 6, 7, 8]));
    recorder.add(base64Of([9, 9]));

    expect([...recorder.toWav().slice(44)]).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
