/**
 * Fetches the voice session token before the user taps call, so the tap does
 * not wait on the API (which builds memory context and asks Gemini for the
 * token). A prefetched token is used by one call only, and only when it was
 * fetched for the same user, conversation and voice.
 *
 * Gemini accepts the token for 10 minutes, but the memory context locked into
 * it goes stale sooner, so it is discarded after a few minutes.
 */
export const VOICE_TOKEN_PREFETCH_MAX_AGE_MS = 3 * 60_000;

type Entry = { key: string; startedAt: number; promise: Promise<unknown> };

export class VoiceTokenPrefetch {
  private entry?: Entry;

  constructor(private readonly now: () => number = Date.now) {}

  /** Starts fetching for `key`, unless a fresh fetch for it is already held. */
  prefetch(key: string, fetchToken: () => Promise<unknown>): void {
    if (this.entry?.key === key && this.isFresh(this.entry)) return;
    const entry: Entry = { key, startedAt: this.now(), promise: fetchToken() };
    entry.promise.then(undefined, () => {
      if (this.entry === entry) this.entry = undefined;
    });
    this.entry = entry;
  }

  /** Returns the held fetch for `key` and forgets it. The promise may reject. */
  take(key: string): Promise<unknown> | undefined {
    const entry = this.entry;
    this.entry = undefined;
    return entry && entry.key === key && this.isFresh(entry) ? entry.promise : undefined;
  }

  clear(): void {
    this.entry = undefined;
  }

  private isFresh(entry: Entry): boolean {
    return this.now() - entry.startedAt <= VOICE_TOKEN_PREFETCH_MAX_AGE_MS;
  }
}
