/**
 * Whether Memento is working on a reply the user is waiting for: the user
 * spoke, went quiet, and no reply audio has arrived yet (or a tool is
 * running). The call screen shows "Thinking…" then, instead of "Listening…",
 * so the wait between turns reads as thought, not as a frozen call.
 */

/** Quiet this long after the user's last speech before showing Thinking. */
export const VOICE_THINKING_QUIET_MS = 400;
/** Give up showing Thinking if no reply arrives within this long. */
export const VOICE_THINKING_MAX_MS = 8_000;
/** Mic level (RMS 0..1) counted as the user speaking. */
export const VOICE_THINKING_SPEECH_RMS = 0.012;
/** Speech frames further apart than this do not add up to the user speaking. */
export const VOICE_THINKING_SPEECH_GAP_MS = 300;
/**
 * Speech frames (40 ms each) that count as the user having said something.
 * Gemini's transcript of the user arrives only just before its reply, so the
 * mic itself is the early signal; a click or a cough is too short to count.
 */
export const VOICE_THINKING_MIN_SPEECH_FRAMES = 6;

export class VoiceThinkingTracker {
  private heardUser = false;
  private speechFrames = 0;
  private lastSpeechAt = 0;
  private toolRunning = false;
  private waitingSince = 0;

  constructor(private readonly now: () => number = Date.now) {}

  /** Each mic frame sent to Gemini, with its level. */
  observeMic(rms: number): void {
    if (rms < VOICE_THINKING_SPEECH_RMS) return;
    const at = this.now();
    if (!this.heardUser && at - this.lastSpeechAt > VOICE_THINKING_SPEECH_GAP_MS) this.speechFrames = 0;
    this.lastSpeechAt = at;
    this.waitingSince = 0;
    this.speechFrames += 1;
    if (this.speechFrames >= VOICE_THINKING_MIN_SPEECH_FRAMES) this.heardUser = true;
  }


  /** How long the user has been quiet since they last spoke; undefined if not heard this turn. */
  quietForMs(): number | undefined {
    return this.heardUser ? this.now() - this.lastSpeechAt : undefined;
  }

  /** Gemini transcribed something the user said. */
  observeUserTranscript(): void {
    this.heardUser = true;
    this.lastSpeechAt = Math.max(this.lastSpeechAt, this.now());
    this.waitingSince = 0;
  }

  observeToolCall(): void {
    this.toolRunning = true;
    this.waitingSince ||= this.now();
  }

  /** Reply audio arrived, the turn ended, or it was interrupted. */
  reset(): void {
    this.heardUser = false;
    this.speechFrames = 0;
    this.toolRunning = false;
    this.waitingSince = 0;
  }

  isThinking(aiSpeaking: boolean): boolean {
    if (aiSpeaking) return false;
    const at = this.now();
    if (!this.toolRunning) {
      if (!this.heardUser || at - this.lastSpeechAt < VOICE_THINKING_QUIET_MS) return false;
    }
    this.waitingSince ||= at;
    if (at - this.waitingSince > VOICE_THINKING_MAX_MS) {
      this.reset();
      return false;
    }
    return true;
  }
}
