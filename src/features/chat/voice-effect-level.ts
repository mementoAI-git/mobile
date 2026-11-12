import { calculateRmsEnergy, pcm16Base64ToFloat32 } from './voice-pcm';

/** Map incoming assistant PCM energy to the decorative glow's 0–1 range. */
export function voiceEffectLevel(pcm: string): number {
  try {
    const decoded = pcm16Base64ToFloat32(pcm);
    return decoded.ok ? Math.min(1, calculateRmsEnergy(decoded.samples) * 7) : 0;
  } catch {
    return 0;
  }
}

/** Length of one level window of the playback meter. */
export const PLAYBACK_LEVEL_WINDOW_MS = 50;
const OUTPUT_SAMPLE_RATE = 24_000;
const WINDOW_SAMPLES = (OUTPUT_SAMPLE_RATE * PLAYBACK_LEVEL_WINDOW_MS) / 1000;

/**
 * The level of Memento's voice at the moment it is heard. Audio arrives in
 * bursts well ahead of playback, so each chunk is split into 50 ms windows on
 * arrival and read back at the play position: everything received minus what
 * is still buffered. Past the end of what was received (listening, idle) it
 * reads 0.
 */
export class PlaybackLevelMeter {
  private levels: number[] = [];
  /** Windows dropped from the front of `levels`, so old audio is not kept. */
  private dropped = 0;
  private receivedMs = 0;

  push(pcm: string) {
    let samples: Float32Array;
    try {
      const decoded = pcm16Base64ToFloat32(pcm);
      if (!decoded.ok) return;
      samples = decoded.samples;
    } catch {
      return;
    }
    for (let start = 0; start < samples.length; start += WINDOW_SAMPLES) {
      const window = samples.subarray(start, Math.min(samples.length, start + WINDOW_SAMPLES));
      this.levels.push(Math.min(1, calculateRmsEnergy(window) * 7));
    }
    this.receivedMs += (samples.length / OUTPUT_SAMPLE_RATE) * 1000;
  }

  /** The level being heard, given how much received audio is still waiting to play. */
  level(bufferedMs: number): number {
    const playedMs = Math.max(0, this.receivedMs - Math.max(0, bufferedMs));
    const index = Math.floor(playedMs / PLAYBACK_LEVEL_WINDOW_MS) - this.dropped;
    // Keep a little history; the rest is behind the play position for good.
    const trim = index - 20;
    if (trim > 0) {
      this.levels.splice(0, trim);
      this.dropped += trim;
    }
    const at = Math.floor(playedMs / PLAYBACK_LEVEL_WINDOW_MS) - this.dropped;
    return at >= 0 && at < this.levels.length ? this.levels[at] : 0;
  }

  /** Memento was interrupted or the call ended: nothing queued is going to play. */
  reset() {
    this.levels = [];
    this.dropped = 0;
    this.receivedMs = 0;
  }
}
