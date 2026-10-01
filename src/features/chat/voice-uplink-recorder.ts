/**
 * Development-only capture of the microphone audio actually sent to Gemini,
 * saved as a WAV so it can be inspected when Gemini hears nothing useful.
 * Enabled with EXPO_PUBLIC_VOICE_DEBUG_RECORD=true in __DEV__ builds only.
 */
const SAMPLE_RATE = 16_000;
const BYTES_PER_SECOND = SAMPLE_RATE * 2;

export class VoiceUplinkRecorder {
  private readonly chunks: Uint8Array[] = [];
  private byteLength = 0;

  constructor(private readonly maxSeconds = 60) {}

  add(base64Pcm: string): void {
    if (this.byteLength >= this.maxSeconds * BYTES_PER_SECOND) return;
    const binary = atob(base64Pcm);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    this.chunks.push(bytes);
    this.byteLength += bytes.length;
  }

  toWav(): Uint8Array {
    const pcm = new Uint8Array(this.byteLength);
    let offset = 0;
    for (const chunk of this.chunks) {
      pcm.set(chunk, offset);
      offset += chunk.length;
    }
    return buildPcm16Wav(pcm, SAMPLE_RATE);
  }
}

export function buildPcm16Wav(pcm: Uint8Array, sampleRate: number): Uint8Array {
  const wav = new Uint8Array(44 + pcm.length);
  const view = new DataView(wav.buffer);
  const ascii = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) wav[offset + index] = text.charCodeAt(index);
  };
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, 'data');
  view.setUint32(40, pcm.length, true);
  wav.set(pcm, 44);
  return wav;
}

/** Writes the recording to the app's documents folder and returns its URI. */
export function saveUplinkRecording(recorder: VoiceUplinkRecorder): string | undefined {
  try {
    const { File, Paths } = require('expo-file-system') as typeof import('expo-file-system');
    const file = new File(Paths.document, `voice-uplink-${Date.now()}.wav`);
    file.write(recorder.toWav());
    return file.uri;
  } catch {
    return undefined;
  }
}
