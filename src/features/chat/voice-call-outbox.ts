import type { VoiceTurnPayload } from './voice-turn-sync';

/**
 * On-device outbox for voice call transcripts. Completed turns are written
 * here as the call goes, and the call end at hang-up, so neither is lost to a
 * dead network at hang-up or to the app being killed. Entries leave only once
 * the server has acknowledged them.
 *
 * The server is idempotent: turns upsert on (session, index), the conversation
 * is found by session_id when memory_id is unknown, and the call end only sets
 * its clean-up status on first insert. So resending is safe. The call end
 * starts transcript clean-up, so it is sent only after every turn is saved.
 *
 * Stored per account, and dropped after VOICE_OUTBOX_MAX_AGE_MS so personal
 * transcripts don't linger on the device.
 */

export const VOICE_OUTBOX_MAX_AGE_MS = 7 * 24 * 60 * 60_000;
const MAX_BATCH = 50;
const MAX_ENTRIES = 20;

export type VoiceOutboxEntry = {
  sessionId: string;
  memoryId?: string;
  /** Completed turns the server has not acknowledged yet. */
  turns: VoiceTurnPayload[];
  /** Set at hang-up. */
  end?: { durationSeconds: number };
  savedAt: number;
};

export type VoiceOutboxPoster = (url: string, body: Record<string, unknown>) => Promise<unknown>;

export type VoiceOutboxStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

type Options = {
  turnsUrl: string;
  endUrl: (sessionId: string) => string;
  now?: () => number;
};

function isEntry(value: unknown): value is VoiceOutboxEntry {
  const entry = value as VoiceOutboxEntry | null;
  return (
    typeof entry?.sessionId === 'string' &&
    Array.isArray(entry.turns) &&
    typeof entry.savedAt === 'number'
  );
}

function responseMemoryId(response: unknown): string | undefined {
  const memoryId = (response as { data?: { memory_id?: unknown } } | undefined)?.data?.memory_id;
  return typeof memoryId === 'string' && memoryId ? memoryId : undefined;
}

export class VoiceCallOutbox {
  private readonly key: string;
  private readonly now: () => number;
  /** Serializes storage reads and writes. */
  private chain: Promise<unknown> = Promise.resolve();
  /** Drains run one after another, each with its own options. */
  private drains: Promise<boolean> = Promise.resolve(true);

  constructor(
    private readonly storage: VoiceOutboxStorage,
    userKey: string,
    private readonly options: Options,
  ) {
    this.key = `memento.voice-outbox.v1.${userKey}`;
    this.now = options.now ?? Date.now;
  }

  list(): Promise<VoiceOutboxEntry[]> {
    return this.serial(() => this.read());
  }

  /** Replaces a call's unacknowledged turns with the latest snapshot. */
  saveTurns(sessionId: string, memoryId: string | undefined, turns: VoiceTurnPayload[]): Promise<void> {
    return this.update(sessionId, (entry) => ({
      ...entry,
      memoryId: memoryId ?? entry.memoryId,
      turns,
    }));
  }

  /** Records the hang-up, so the call end is sent once every turn is saved. */
  markEnded(sessionId: string, durationSeconds: number): Promise<void> {
    return this.update(sessionId, (entry) => ({ ...entry, end: { durationSeconds } }));
  }

  forget(sessionId: string): Promise<void> {
    return this.serial(async () => {
      await this.write((await this.read()).filter((entry) => entry.sessionId !== sessionId));
    });
  }

  /**
   * Sends everything it can, oldest call first. Stops at the first failure
   * and returns false; what was acknowledged is already removed, so the next
   * drain resumes. `skipSessionId` is the call in progress.
   */
  drain(post: VoiceOutboxPoster, options: { skipSessionId?: string } = {}): Promise<boolean> {
    // Queue rather than join a running drain: that one may be skipping a call
    // that has just ended and now needs sending.
    const run = () => this.drainAll(post, options);
    this.drains = this.drains.then(run, run);
    return this.drains;
  }

  private async drainAll(post: VoiceOutboxPoster, options: { skipSessionId?: string }): Promise<boolean> {
    const now = this.now();
    const entries = await this.list();
    for (const expired of entries.filter((entry) => now - entry.savedAt > VOICE_OUTBOX_MAX_AGE_MS)) {
      await this.forget(expired.sessionId);
    }
    const live = entries
      .filter((entry) => now - entry.savedAt <= VOICE_OUTBOX_MAX_AGE_MS)
      .filter((entry) => entry.sessionId !== options.skipSessionId)
      .sort((a, b) => a.savedAt - b.savedAt);

    for (const entry of live) {
      let memoryId = entry.memoryId;
      let turns = entry.turns;
      while (turns.length) {
        const batch = turns.slice(0, MAX_BATCH);
        try {
          const response = await post(this.options.turnsUrl, {
            session_id: entry.sessionId,
            ...(memoryId ? { memory_id: memoryId } : {}),
            turns: batch,
          });
          memoryId = responseMemoryId(response) ?? memoryId;
        } catch {
          return false;
        }
        const sent = new Set(batch.map((turn) => turn.index));
        turns = turns.slice(batch.length);
        const learned = memoryId;
        await this.update(entry.sessionId, (current) => ({
          ...current,
          memoryId: learned ?? current.memoryId,
          turns: current.turns.filter((turn) => !sent.has(turn.index)),
        }));
      }

      if (entry.end) {
        try {
          await post(this.options.endUrl(entry.sessionId), {
            duration_seconds: Math.max(0, Math.round(entry.end.durationSeconds)),
            ...(memoryId ? { memory_id: memoryId } : {}),
          });
        } catch {
          return false;
        }
      }
      // Ended and recorded, or left unfinished by a crash with nothing more
      // to send: either way the call is done.
      await this.forget(entry.sessionId);
    }
    return true;
  }

  private update(
    sessionId: string,
    change: (entry: VoiceOutboxEntry) => VoiceOutboxEntry,
  ): Promise<void> {
    return this.serial(async () => {
      const entries = await this.read();
      const index = entries.findIndex((entry) => entry.sessionId === sessionId);
      const base: VoiceOutboxEntry =
        index >= 0 ? entries[index] : { sessionId, turns: [], savedAt: this.now() };
      const next = { ...change(base), savedAt: this.now() };
      if (index >= 0) entries[index] = next;
      else entries.push(next);
      // Keep the newest calls if something has gone badly wrong.
      entries.sort((a, b) => a.savedAt - b.savedAt);
      await this.write(entries.slice(-MAX_ENTRIES));
    });
  }

  private async read(): Promise<VoiceOutboxEntry[]> {
    try {
      const raw = await this.storage.getItem(this.key);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
    } catch {
      return [];
    }
  }

  private async write(entries: VoiceOutboxEntry[]): Promise<void> {
    if (entries.length) await this.storage.setItem(this.key, JSON.stringify(entries));
    else await this.storage.removeItem(this.key);
  }

  private serial<T>(work: () => Promise<T>): Promise<T> {
    const run = this.chain.then(work, work);
    this.chain = run.catch(() => undefined);
    return run;
  }
}
