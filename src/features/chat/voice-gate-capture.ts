import {
  toRanges,
  VOICE_CAPTURE_FRAME_SAMPLES,
  type VoiceGateCaptureFile,
} from './voice-gate-replay';
import { buildPcm16Wav } from './voice-uplink-recorder';

/**
 * Development-only capture of the raw microphone, before the speaker gate or
 * echo filter, with what the engine knew about each frame: whether Memento
 * was audible on the loudspeaker and whether the greeting shield was up.
 * Saved as a WAV plus a JSON file, for replay through voice-gate-replay.ts.
 * Enabled with EXPO_PUBLIC_VOICE_DEBUG_CAPTURE=true in __DEV__ builds only.
 */

const SAMPLE_RATE = 16_000;

export type VoiceMicFrameFlags = {
  audibleOnSpeaker: boolean;
  greetingShield: boolean;
};

export class VoiceGateCapture {
  private readonly chunks: Int16Array[] = [];
  private readonly audible: boolean[] = [];
  private readonly greeting: boolean[] = [];
  private readonly maxFrames: number;

  /** `maxSeconds`: 5 minutes is about 10 MB. */
  constructor(maxSeconds = 300) {
    this.maxFrames = Math.floor((maxSeconds * SAMPLE_RATE) / VOICE_CAPTURE_FRAME_SAMPLES);
  }

  add(samples: Float32Array, flags: VoiceMicFrameFlags): void {
    if (this.chunks.length >= this.maxFrames) return;
    const pcm = new Int16Array(samples.length);
    for (let index = 0; index < samples.length; index += 1) {
      const value = Math.max(-1, Math.min(1, samples[index]));
      pcm[index] = Math.round(value * 32767);
    }
    this.chunks.push(pcm);
    this.audible.push(flags.audibleOnSpeaker);
    this.greeting.push(flags.greetingShield);
  }

  toFiles(meta?: Record<string, unknown>): { wav: Uint8Array; capture: VoiceGateCaptureFile } {
    const length = this.chunks.reduce((total, chunk) => total + chunk.length, 0);
    const pcm = new Int16Array(length);
    let offset = 0;
    for (const chunk of this.chunks) {
      pcm.set(chunk, offset);
      offset += chunk.length;
    }
    return {
      wav: buildPcm16Wav(new Uint8Array(pcm.buffer), SAMPLE_RATE),
      capture: {
        version: 1,
        sampleRate: SAMPLE_RATE,
        frameSamples: VOICE_CAPTURE_FRAME_SAMPLES,
        frames: this.chunks.length,
        audibleOnSpeaker: toRanges(this.audible),
        greetingShield: toRanges(this.greeting),
        ...(meta ? { meta } : {}),
      },
    };
  }
}

/** Reads a 16-bit mono PCM WAV as written by buildPcm16Wav. */
export function readPcm16Wav(wav: Uint8Array): { sampleRate: number; samples: Float32Array } {
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  const sampleRate = view.getUint32(24, true);
  const dataLength = view.getUint32(40, true);
  const samples = new Float32Array(Math.floor(dataLength / 2));
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = view.getInt16(44 + index * 2, true) / 32767;
  }
  return { sampleRate, samples };
}

/**
 * Writes `voice-gate-<time>.wav` and `.json` to the app's documents folder
 * and returns the WAV's URI.
 */
export function saveGateCapture(
  capture: VoiceGateCapture,
  meta: Record<string, unknown>,
): string | undefined {
  try {
    const { File, Paths } = require('expo-file-system') as typeof import('expo-file-system');
    const { wav, capture: file } = capture.toFiles(meta);
    const name = `voice-gate-${Date.now()}`;
    const audio = new File(Paths.document, `${name}.wav`);
    audio.write(wav);
    new File(Paths.document, `${name}.json`).write(JSON.stringify(file));
    return audio.uri;
  } catch {
    return undefined;
  }
}
