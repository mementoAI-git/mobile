/**
 * A call prepared while the user looks at the Start button: the Gemini
 * session is open and set up, and Memento's greeting has been asked for, so
 * tapping Start only has to start audio and play what is already there
 * (instead of ~2.5 s of connect, setup and greeting generation).
 *
 * The microphone stays off until the tap: the prepared session receives
 * nothing from the user. Its messages (setup, greeting audio and transcript)
 * are held in a buffer and replayed through the normal message path when the
 * call starts, so the call sees them exactly as if they had just arrived.
 */

/** Same window as the prefetched token: the memory context in it goes stale. */
export const VOICE_WARM_START_MAX_AGE_MS = 3 * 60_000;

/** Holds a session's messages until the call starts, then passes them on. */
export class VoiceMessageBuffer<M> {
  private messages: M[] = [];
  private deliver?: (message: M) => void;

  /** Called for each message from the prepared session. */
  push(message: M): void {
    if (this.deliver) {
      this.deliver(message);
      return;
    }
    // Bounded: a greeting is a few dozen messages. Past this the prepared
    // session is misbehaving, and the oldest messages go.
    if (this.messages.length >= 2_000) this.messages.shift();
    this.messages.push(message);
  }

  /**
   * Replays everything held, in order, then hands later messages straight
   * to `deliver`. Synchronous, so nothing can arrive in between.
   */
  release(deliver: (message: M) => void): number {
    const held = this.messages;
    this.messages = [];
    for (const message of held) deliver(message);
    this.deliver = deliver;
    return held.length;
  }

  get size(): number {
    return this.messages.length;
  }
}

export type WarmCall<S, T, M> = {
  key: string;
  startedAt: number;
  session: S;
  transport: number;
  liveToken: T;
  buffer: VoiceMessageBuffer<M>;
};

type Closable = { close(): void };

/** At most one prepared call, for one conversation and voice. */
export class VoiceWarmStart<S extends Closable, T, M> {
  private warm?: WarmCall<S, T, M> & { closed: boolean };
  /** Sessions that closed on their own (Gemini timeout, network). */
  private closedSessions = new WeakSet<object>();

  constructor(private readonly now: () => number = Date.now) {}

  hold(call: WarmCall<S, T, M>): void {
    this.discard();
    this.warm = { ...call, closed: this.closedSessions.has(call.session) };
  }

  /** The prepared session closed by itself: it can no longer be used. */
  markClosed(session: S): void {
    this.closedSessions.add(session);
    if (this.warm?.session === session) this.warm.closed = true;
  }

  isHeldFor(key: string): boolean {
    return Boolean(this.warm && this.warm.key === key && this.usable(this.warm));
  }

  /**
   * The prepared call for `key`, if it is still usable; it is no longer
   * held either way. An unusable one is closed.
   */
  take(key: string): WarmCall<S, T, M> | undefined {
    const warm = this.warm;
    this.warm = undefined;
    if (!warm) return undefined;
    if (warm.key === key && this.usable(warm)) {
      const { closed: _closed, ...call } = warm;
      return call;
    }
    closeQuietly(warm.session);
    return undefined;
  }

  /** Closes and forgets the prepared call (left the screen, changed voice). */
  discard(): void {
    const warm = this.warm;
    this.warm = undefined;
    if (warm) closeQuietly(warm.session);
  }

  private usable(warm: WarmCall<S, T, M> & { closed: boolean }): boolean {
    return !warm.closed && this.now() - warm.startedAt <= VOICE_WARM_START_MAX_AGE_MS;
  }
}

function closeQuietly(session: Closable): void {
  try {
    session.close();
  } catch {
    // Already closed.
  }
}
