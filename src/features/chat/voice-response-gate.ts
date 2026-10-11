/**
 * Decides whether model output belongs to a response the user abandoned.
 *
 * With automatic activity detection, Gemini Live has no message that cancels
 * the response it is generating. When the user taps Interrupt, clearing local
 * playback is not enough: Gemini keeps streaming the same response and it
 * would start playing again. So the rest of that response is dropped until
 * Gemini marks its end, with `turnComplete` or its own `interrupted`.
 *
 * A tap after the response already finished discards nothing, so the next
 * reply is never lost.
 */
export class VoiceResponseGate {
  private turnOpen = false;
  private discarding = false;

  /**
   * Call for each model audio part. False means drop it. Only audio opens a
   * response: Gemini can send a turn's final transcript after turnComplete.
   */
  acceptOutput(): boolean {
    if (this.discarding) return false;
    this.turnOpen = true;
    return true;
  }

  /**
   * Call for each model output transcript. Never opens a response, so a late
   * transcript for a finished turn can't make a later tap swallow the next reply.
   */
  acceptTranscript(): boolean {
    return !this.discarding;
  }

  isDiscarding(): boolean {
    return this.discarding;
  }

  /** The user interrupted locally. Returns true when output is now being dropped. */
  interruptLocally(): boolean {
    if (this.turnOpen) {
      this.discarding = true;
      this.turnOpen = false;
    }
    return this.discarding;
  }

  /** Call on `turnComplete` and on a server `interrupted`. */
  endTurn(): { discarded: boolean } {
    const discarded = this.discarding;
    this.discarding = false;
    this.turnOpen = false;
    return { discarded };
  }

  reset(): void {
    this.discarding = false;
    this.turnOpen = false;
  }
}
