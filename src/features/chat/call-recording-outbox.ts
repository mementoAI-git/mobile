import type { RecordingSegment, SpeechSpan } from './call-recording';

/**
 * On-device outbox for recorded voice conversations. A finished recording is
 * written here before anything is sent, so it survives a dead network or the
 * app being killed, and leaves (with its audio file) only once the server has
 * saved it as a story. The server is idempotent per call session, so sending
 * again is safe: an upload that already succeeded is not repeated.
 */

export type RecordingOutboxEntry = {
  sessionId: string;
  /** Local audio file (file:// URI). */
  uri: string;
  durationSeconds: number;
  segments: RecordingSegment[];
  /** When someone was audible; the rest is silence. Empty on builds without it. */
  speech?: SpeechSpan[];
  /** Set once the audio is uploaded. */
  fileId?: string;
  savedAt: number;
};

export type RecordingOutboxStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

export type RecordingOutboxDeps = {
  /** Uploads the audio, resolving the stored file id. */
  upload(entry: RecordingOutboxEntry): Promise<string>;
  /** Saves the recording as a story for the call. */
  save(entry: RecordingOutboxEntry & { fileId: string }): Promise<void>;
  /** Removes the local audio once the server has it. */
  deleteFile(uri: string): void;
};

/** Recordings older than this are dropped from the device. */
export const RECORDING_OUTBOX_MAX_AGE_MS = 14 * 24 * 60 * 60_000;

export function recordingSavePath(sessionId: string) {
  return `/ai/voice/calls/${encodeURIComponent(sessionId)}/recording`;
}

export function buildRecordingSaveBody(
  entry: Pick<RecordingOutboxEntry, 'durationSeconds' | 'segments' | 'speech'> & { fileId: string },
) {
  return {
    file_id: entry.fileId,
    duration_seconds: Math.max(0, Math.round(entry.durationSeconds)),
    segments: entry.segments,
    ...(entry.speech?.length ? { speech: entry.speech } : {}),
  };
}

function isEntry(value: unknown): value is RecordingOutboxEntry {
  const entry = value as RecordingOutboxEntry | null;
  return typeof entry?.sessionId === 'string' && typeof entry.uri === 'string' && Array.isArray(entry.segments);
}

export class CallRecordingOutbox {
  private queue: Promise<unknown> = Promise.resolve();
  private draining = false;

  constructor(
    private readonly storage: RecordingOutboxStorage,
    userId: string,
    private readonly now: () => number = Date.now,
  ) {
    this.key = `memento.call-recordings.${userId}`;
  }

  private readonly key: string;

  /** Serializes storage writes so concurrent updates never lose an entry. */
  private run<T>(task: () => Promise<T>): Promise<T> {
    const next = this.queue.then(task, task);
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async read(): Promise<RecordingOutboxEntry[]> {
    try {
      const parsed = JSON.parse((await this.storage.getItem(this.key)) ?? '[]');
      return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
    } catch {
      return [];
    }
  }

  private write(entries: RecordingOutboxEntry[]) {
    return this.storage.setItem(this.key, JSON.stringify(entries));
  }

  add(entry: Omit<RecordingOutboxEntry, 'savedAt'>) {
    return this.run(async () => {
      const entries = (await this.read()).filter((existing) => existing.sessionId !== entry.sessionId);
      await this.write([...entries, { ...entry, savedAt: this.now() }]);
    });
  }

  entries() {
    return this.run(() => this.read());
  }

  private update(sessionId: string, change: (entry: RecordingOutboxEntry) => RecordingOutboxEntry | null) {
    return this.run(async () => {
      const entries = await this.read();
      const next = entries.flatMap((entry) => {
        if (entry.sessionId !== sessionId) return [entry];
        const changed = change(entry);
        return changed ? [changed] : [];
      });
      await this.write(next);
    });
  }

  /** Sends every saved recording; returns how many reached the server. */
  async drain(deps: RecordingOutboxDeps): Promise<number> {
    if (this.draining) return 0;
    this.draining = true;
    let sent = 0;
    try {
      for (const entry of await this.entries()) {
        if (this.now() - entry.savedAt > RECORDING_OUTBOX_MAX_AGE_MS) {
          deps.deleteFile(entry.uri);
          await this.update(entry.sessionId, () => null);
          continue;
        }
        try {
          const fileId = entry.fileId ?? (await deps.upload(entry));
          if (!entry.fileId) await this.update(entry.sessionId, (current) => ({ ...current, fileId }));
          await deps.save({ ...entry, fileId });
          deps.deleteFile(entry.uri);
          await this.update(entry.sessionId, () => null);
          sent += 1;
        } catch {
          // Kept for the next drain (launch, sign-in or the network returning).
        }
      }
    } finally {
      this.draining = false;
    }
    return sent;
  }
}
