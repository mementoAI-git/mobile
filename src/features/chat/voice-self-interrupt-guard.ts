/**
 * Notices when Memento keeps interrupting itself on the loudspeaker, and asks
 * for the call to fall back to the speaker gate for a while (no talking over
 * Memento; the Interrupt button still works). A degraded call beats an
 * unusable one, but not for the whole call: after VOICE_FALLBACK_MS the caller
 * restores full duplex, and each further fallback lasts twice as long.
 *
 * The signal is what Gemini heard, not how loud it was. After an interruption,
 * if the words Gemini transcribed as the user are mostly Memento's own recent
 * words, or nothing at all, Memento heard itself. A real interruption ("wait",
 * "actually it was my aunt") uses the user's own words. The judgement waits
 * until Memento starts answering, so the user can finish speaking first.
 *
 * An interruption within VOICE_ONSET_INTERRUPT_MS of Memento starting to talk
 * is judged at once: nobody reacts that fast, and distorted echo often
 * transcribes as different words, so the words cannot be trusted for it.
 *
 * One suspected self-interruption is enough to fall back: at high volume it
 * repeats, and every repeat cuts Memento off mid-sentence. The fallback ends
 * only once the leftover echo has dropped (see shouldRestore), not on a timer
 * alone, so a call still at full volume is not handed back to the echo.
 */

/** Suspected self-interruptions before falling back. */
export const VOICE_SELF_INTERRUPT_LIMIT = 1;
/** An interruption this soon after Memento became audible is its own echo. */
export const VOICE_ONSET_INTERRUPT_MS = 400;
/** Leftover echo must fall to this share of its level when the fallback began. */
export const VOICE_RESTORE_ECHO_RATIO = 0.5;
/** Below this, leftover echo is too faint to trigger anything. */
export const VOICE_RESTORE_ECHO_FLOOR = 0.015;
/** Seconds of Memento's speech to measure before trusting a low echo reading. */
export const VOICE_RESTORE_MIN_MEASURED_S = 1;

/** Whether the echo has dropped enough to listen while Memento talks again. */
export function shouldRestore(
  levelAtFallback: number,
  levelNow: number,
  measuredSeconds: number,
): boolean {
  if (measuredSeconds < VOICE_RESTORE_MIN_MEASURED_S) return false;
  return (
    levelNow <= VOICE_RESTORE_ECHO_FLOOR ||
    levelNow <= levelAtFallback * VOICE_RESTORE_ECHO_RATIO
  );
}
/** How far back Memento's words count as a possible echo. */
export const VOICE_ECHO_MEMORY_MS = 15_000;
/** Share of the heard words that must be Memento's own. */
export const VOICE_ECHO_WORD_OVERLAP = 0.6;
/** First fallback; each later one doubles, up to VOICE_FALLBACK_MAX_MS. */
export const VOICE_FALLBACK_MS = 30_000;
export const VOICE_FALLBACK_MAX_MS = 120_000;

type Options = {
  now: () => number;
  /** Fall back now; call restore() after `durationMs`. */
  onFallback: (durationMs: number) => void;
  limit?: number;
};

function words(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [];
}

export class VoiceSelfInterruptGuard {
  private spoken: { at: number; words: string[] }[] = [];
  private pending?: { heard: string; interim: string };
  private readonly limit: number;
  suspected = 0;
  fellBack = false;
  /** Times this call fell back. */
  fallbacks = 0;
  /** Interruptions within VOICE_ONSET_INTERRUPT_MS of Memento starting to talk. */
  onsetInterruptions = 0;
  /** Suspects since the last restore. */
  private sinceRestore = 0;

  constructor(private readonly options: Options) {
    this.limit = options.limit ?? VOICE_SELF_INTERRUPT_LIMIT;
  }

  observeOutputText(text: string): void {
    const found = words(text);
    if (found.length) this.spoken.push({ at: this.options.now(), words: found });
  }

  /**
   * `onSpeakerFullDuplex`: the mic was open on the loudspeaker while Memento
   * talked. `audibleForMs`: how long Memento had been audible when cut off.
   */
  observeInterrupted(onSpeakerFullDuplex: boolean, audibleForMs?: number): void {
    this.judge();
    if (!onSpeakerFullDuplex || this.fellBack) return;
    if (audibleForMs !== undefined && audibleForMs < VOICE_ONSET_INTERRUPT_MS) {
      this.onsetInterruptions += 1;
      this.suspect();
      return;
    }
    this.pending = { heard: '', interim: '' };
  }

  /** Final transcripts arrive in pieces; an interim one replaces the last. */
  observeInputText(text: string, isInterim = false): void {
    if (!this.pending) return;
    if (isInterim) this.pending.interim = text;
    else this.pending.heard += text;
  }

  /** Memento started answering what it heard. */
  observeModelAudio(): void {
    this.judge();
  }

  private judge(): void {
    const pending = this.pending;
    if (!pending) return;
    this.pending = undefined;

    const heard = words(pending.heard || pending.interim);
    const cutoff = this.options.now() - VOICE_ECHO_MEMORY_MS;
    this.spoken = this.spoken.filter((entry) => entry.at >= cutoff);
    const recent = new Set(this.spoken.flatMap((entry) => entry.words));
    const own = heard.filter((word) => recent.has(word)).length;
    const echo = heard.length === 0 || own / heard.length >= VOICE_ECHO_WORD_OVERLAP;
    if (!echo) return;
    this.suspect();
  }

  private suspect(): void {
    this.suspected += 1;
    this.sinceRestore += 1;
    if (this.sinceRestore >= this.limit && !this.fellBack) {
      this.fellBack = true;
      this.fallbacks += 1;
      this.options.onFallback(
        Math.min(VOICE_FALLBACK_MS * 2 ** (this.fallbacks - 1), VOICE_FALLBACK_MAX_MS),
      );
    }
  }

  /** Full duplex is back on: start counting afresh. */
  restore(): void {
    this.fellBack = false;
    this.sinceRestore = 0;
    this.pending = undefined;
  }
}
