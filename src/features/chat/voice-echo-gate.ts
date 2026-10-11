import { BARGE_IN_THRESHOLDS, calculateRmsEnergy, isBargeInSpeech } from './voice-pcm';

/**
 * Leftover-echo filter for full duplex on the loudspeaker. Echo cancellation
 * removes most of Memento's voice from the mic, but some leaks through, and
 * Gemini hears it as the user talking and cuts Memento off. While Memento is
 * audible, only frames clearly louder than leftover echo pass; once the user
 * gets through, the mic stays open for the rest of the sentence.
 *
 * Two things keep it from clipping the user:
 * - Pre-roll: while gating, frames are held back briefly instead of being
 *   silenced at once. When speech is confirmed, the held frames go out as they
 *   were, so the soft start of a word ("w-" in "wait") reaches Gemini. Frames
 *   that turn out to be echo go out as silence, keeping the stream continuous.
 * - Confirmation: one loud frame alone (a click, a bump, an echo transient)
 *   does not open the mic; two speech-level frames within the held window do,
 *   or one very loud frame.
 *
 * The thresholds are loudness heuristics, not a speech classifier. Tune them
 * from recordings, not by feel.
 */

/** 3 frames of 40 ms: the start of a word kept before speech is confirmed. */
export const VOICE_ECHO_PRE_ROLL_FRAMES = 3;
/** Speech-level frames, within the held window, that confirm the user is talking. */
export const VOICE_ECHO_CONFIRM_FRAMES = 2;

type HeldFrame = { samples: Float32Array; speech: boolean };

export type VoiceEchoGateOptions = {
  now: () => number;
  holdMs: number;
  preRollFrames?: number;
  confirmFrames?: number;
};

export class VoiceEchoGate {
  private held: HeldFrame[] = [];
  private openUntil = 0;
  private readonly preRollFrames: number;
  private readonly confirmFrames: number;
  /** Frames sent as silence. */
  suppressed = 0;
  /** Times the user's voice opened the mic. */
  bargeIns = 0;

  constructor(private readonly options: VoiceEchoGateOptions) {
    this.preRollFrames = options.preRollFrames ?? VOICE_ECHO_PRE_ROLL_FRAMES;
    this.confirmFrames = options.confirmFrames ?? VOICE_ECHO_CONFIRM_FRAMES;
  }

  /**
   * Takes one mic frame and returns the frames to send now, in order.
   * `gating` is whether Memento is audible on the loudspeaker.
   */
  process(samples: Float32Array, gating: boolean): Float32Array[] {
    if (!gating) {
      // Held frames did not confirm speech while Memento was audible.
      const out = this.releaseHeld(false);
      out.push(samples);
      return out;
    }

    const at = this.options.now();
    if (at < this.openUntil) {
      const out = this.releaseHeld(true);
      out.push(samples);
      return out;
    }

    const instant = calculateRmsEnergy(samples) >= BARGE_IN_THRESHOLDS.instantRmsEnergy;
    // Copied: the recorder may reuse its buffer for the next frame.
    this.held.push({ samples: samples.slice(), speech: instant || isBargeInSpeech(samples) });
    const speechFrames = this.held.filter((frame) => frame.speech).length;
    if (instant || speechFrames >= this.confirmFrames) {
      this.openUntil = at + this.options.holdMs;
      this.bargeIns += 1;
      return this.releaseHeld(true);
    }

    const out: Float32Array[] = [];
    while (this.held.length > this.preRollFrames) {
      out.push(this.silence(this.held.shift()!.samples));
    }
    return out;
  }

  reset(): void {
    this.held = [];
    this.openUntil = 0;
  }

  private releaseHeld(asSpoken: boolean): Float32Array[] {
    const out = this.held.map((frame) => (asSpoken ? frame.samples : this.silence(frame.samples)));
    this.held = [];
    return out;
  }

  private silence(samples: Float32Array): Float32Array {
    this.suppressed += 1;
    return new Float32Array(samples.length);
  }
}
