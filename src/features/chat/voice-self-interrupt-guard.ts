/**
 * Notices when Memento keeps interrupting itself on the loudspeaker, and asks
 * for the call to fall back to the speaker gate (no talking over Memento;
 * the Interrupt button still works). A degraded call beats an unusable one.
 *
 * The signal is what Gemini heard, not how loud it was. After an interruption,
 * if the words Gemini transcribed as the user are mostly Memento's own recent
 * words, or nothing at all, Memento heard itself. A real interruption ("wait",
 * "actually it was my aunt") uses the user's own words. The judgement waits
 * until Memento starts answering, so the user can finish speaking first.
 */

/** Suspected self-interruptions in one call before falling back. */
export const VOICE_SELF_INTERRUPT_LIMIT = 2;
/** How far back Memento's words count as a possible echo. */
export const VOICE_ECHO_MEMORY_MS = 15_000;
/** Share of the heard words that must be Memento's own. */
export const VOICE_ECHO_WORD_OVERLAP = 0.6;

type Options = {
  now: () => number;
  onFallback: () => void;
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

  constructor(private readonly options: Options) {
    this.limit = options.limit ?? VOICE_SELF_INTERRUPT_LIMIT;
  }

  observeOutputText(text: string): void {
    const found = words(text);
    if (found.length) this.spoken.push({ at: this.options.now(), words: found });
  }

  /** `onSpeakerFullDuplex`: the mic was open on the loudspeaker while Memento talked. */
  observeInterrupted(onSpeakerFullDuplex: boolean): void {
    this.judge();
    if (onSpeakerFullDuplex && !this.fellBack) this.pending = { heard: '', interim: '' };
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

    this.suspected += 1;
    if (this.suspected >= this.limit && !this.fellBack) {
      this.fellBack = true;
      this.options.onFallback();
    }
  }
}
