/** Hang up this long after end_call if the model says nothing more. */
export const GOODBYE_QUIET_MS = 1_500;
/** Always hang up by this point, even if Gemini never finishes its turn. */
export const GOODBYE_MAX_MS = 6_000;

/**
 * Decides when it is safe to hang up after the model calls end_call.
 * Gemini may speak the goodbye before the tool call (it is then still
 * playing) or after the tool response (a new turn follows).
 */
export class GoodbyeTracker {
  private sawSpeechAfterResponse = false;
  private turnCompletedAfterSpeech = false;

  constructor(private readonly startedAt: number) {}

  onModelAudio(): void {
    this.sawSpeechAfterResponse = true;
    this.turnCompletedAfterSpeech = false;
  }

  onTurnComplete(): void {
    if (this.sawSpeechAfterResponse) this.turnCompletedAfterSpeech = true;
  }

  shouldHangUp(now: number, isPlaying: boolean): boolean {
    const elapsed = now - this.startedAt;
    if (elapsed >= GOODBYE_MAX_MS) return true;
    if (isPlaying) return false;
    if (this.sawSpeechAfterResponse) return this.turnCompletedAfterSpeech;
    return elapsed >= GOODBYE_QUIET_MS;
  }
}