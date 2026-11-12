/**
 * Hybrid end of turn (Gemini Live "hybrid VAD"): Gemini still detects when
 * the user starts speaking, and the app tells it the user has finished by
 * sending audioStreamEnd, which Gemini treats as "answer now" instead of
 * waiting out its own silence window (450 or 800 ms).
 *
 * Off unless EXPO_PUBLIC_VOICE_HYBRID_END_MS is set. Too short a delay cuts
 * people off mid-thought, so pick it from recordings (voice-gate-replay.ts)
 * and premature-reply rates, not by feel. Gemini's own detection remains the
 * fallback if this never fires.
 */

export function parseHybridEndMs(value: string | undefined): number {
  const ms = Number(value);
  return Number.isFinite(ms) && ms > 0 ? ms : 0;
}

export class VoiceHybridEnd {
  private sent = false;

  constructor(private readonly endMs: number) {}

  /**
   * Per mic frame. `quietMs`: how long the user has been quiet since they
   * last spoke, or undefined if nothing has been heard this turn. True means
   * send audioStreamEnd now; it is true once per pause.
   */
  check(quietMs: number | undefined, aiSpeaking: boolean): boolean {
    if (this.endMs <= 0 || aiSpeaking) return false;
    if (quietMs === undefined || quietMs < this.endMs) {
      this.sent = false;
      return false;
    }
    if (this.sent) return false;
    this.sent = true;
    return true;
  }
}
