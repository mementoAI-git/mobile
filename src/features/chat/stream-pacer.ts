/**
 * Reveals a streamed reply word by word at a steady pace. The chat model
 * (Groq) writes a whole reply in a fraction of a second, so showing chunks
 * as they arrive looks like a pause and then a dump. The pacer keeps what
 * has arrived and shows it a few words at a time, speeding up when it falls
 * far behind so long replies never lag the network by much.
 */

/** Steady reading pace, in words per second. */
export const STREAM_WORDS_PER_SECOND = 35;
/** Never fall further behind what arrived than this. */
export const STREAM_MAX_LAG_MS = 1_500;

/** End of the word that starts at or after `from` (including its trailing space). */
function nextWordEnd(text: string, from: number): number {
  let i = from;
  while (i < text.length && /\s/.test(text[i])) i += 1;
  while (i < text.length && !/\s/.test(text[i])) i += 1;
  return i;
}

function countWords(text: string): number {
  const matches = text.match(/\S+/g);
  return matches ? matches.length : 0;
}

export class StreamPacer {
  private target = '';
  private shownLength = 0;
  private lastTickAt: number | undefined;
  /** Fractional words owed from earlier ticks. */
  private credit = 0;

  constructor(private readonly now: () => number = Date.now) {}

  /** Everything received so far (the full text, not a delta). */
  receive(text: string): void {
    // A full-text replacement that no longer starts with what is shown
    // (rare): show the new text from the start of what still matches.
    if (!text.startsWith(this.target.slice(0, this.shownLength))) {
      let same = 0;
      while (same < this.shownLength && text[same] === this.target[same]) same += 1;
      this.shownLength = same;
    }
    this.target = text;
  }

  /** The text to show now; call on each animation tick. */
  tick(): string {
    const at = this.now();
    const elapsed = this.lastTickAt === undefined ? 0 : at - this.lastTickAt;
    this.lastTickAt = at;
    const backlog = countWords(this.target.slice(this.shownLength));
    if (backlog === 0) {
      this.credit = 0;
      return this.shown();
    }
    // Faster when far behind: clear the backlog within STREAM_MAX_LAG_MS.
    const pace = Math.max(STREAM_WORDS_PER_SECOND, (backlog * 1_000) / STREAM_MAX_LAG_MS);
    this.credit += (elapsed / 1_000) * pace;
    // The first word of a reply appears at once.
    if (this.shownLength === 0 && this.credit < 1) this.credit = 1;
    while (this.credit >= 1 && this.shownLength < this.target.length) {
      this.shownLength = nextWordEnd(this.target, this.shownLength);
      this.credit -= 1;
    }
    return this.shown();
  }

  shown(): string {
    return this.target.slice(0, this.shownLength);
  }

  /** True once everything received is on screen. */
  isCaughtUp(): boolean {
    return countWords(this.target.slice(this.shownLength)) === 0;
  }

  /** Show everything now (the user stopped it, or the screen is going away). */
  flush(): string {
    this.shownLength = this.target.length;
    return this.target;
  }
}
