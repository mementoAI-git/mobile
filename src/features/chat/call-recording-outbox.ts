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
  /** Set once the audio is given up on; only the transcript is saved. */
  audioOmitted?: AudioOmittedReason;
  savedAt: number;
};

/** Why a call's audio could not be kept (the API's audio_omitted values). */
export type AudioOmittedReason = 'too_large' | 'storage_full' | 'upload_failed';

/** What gets saved: an entry with its uploaded audio (fileId) or the reason there is none (audioOmitted). */
export type RecordingToSave = RecordingOutboxEntry;

/**
 * An upload failure that will never succeed on retry: the file is over the
 * upload limit, or the member's storage is full. Anything else (no network,
 * a server hiccup) is worth retrying, so it returns null.
 */
export function audioOmittedReason(error: unknown): AudioOmittedReason | null {
  const failure = error as { httpStatus?: number; status?: number; code?: string } | null;
  const status = failure?.httpStatus ?? failure?.status;
  if (status === 413 || failure?.code === 'payload_too_large') return 'too_large';
  if (failure?.code === 'storage_quota_exceeded') return 'storage_full';
  return null;
}

/** Whether a transcript has anything worth saving on its own. */
function hasWords(entry: Pick<RecordingOutboxEntry, 'segments'>) {
  return entry.segments.some((segment) => segment.text.trim().length > 0);
}

export type RecordingOutboxStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

export type RecordingOutboxDeps = {
  /** Uploads the audio, resolving the stored file id. */
  upload(entry: RecordingOutboxEntry): Promise<string>;
  /** Saves the call as a story: with its audio, or its transcript alone. */
  save(entry: RecordingToSave): Promise<void>;
  /** Removes the local audio once the server has it. */
  deleteFile(uri: string): void;
};

/** Recordings older than this are dropped from the device. */
export const RECORDING_OUTBOX_MAX_AGE_MS = 14 * 24 * 60 * 60_000;

export function recordingSavePath(sessionId: string) {
  return `/ai/voice/calls/${encodeURIComponent(sessionId)}/recording`;
}

export function buildRecordingSaveBody(
  entry: Pick<RecordingOutboxEntry, 'durationSeconds' | 'segments' | 'speech' | 'fileId' | 'audioOmitted'>,
) {
  return {
    ...(entry.fileId ? { file_id: entry.fileId } : { audio_omitted: entry.audioOmitted }),
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
          // Out of retries: keep the conversation itself if anything was said.
          if (hasWords(entry) || entry.fileId) {
            await deps
              .save(entry.fileId ? { ...entry, fileId: entry.fileId, audioOmitted: undefined } : { ...entry, fileId: undefined, audioOmitted: entry.audioOmitted ?? 'upload_failed' })
              .catch(() => undefined);
          }
          deps.deleteFile(entry.uri);
          await this.update(entry.sessionId, () => null);
          continue;
        }
        try {
          let toSave: RecordingToSave;
          if (entry.fileId) {
            toSave = { ...entry, fileId: entry.fileId, audioOmitted: undefined };
          } else if (entry.audioOmitted) {
            toSave = { ...entry, fileId: undefined, audioOmitted: entry.audioOmitted };
          } else {
            try {
              const fileId = await deps.upload(entry);
              await this.update(entry.sessionId, (current) => ({ ...current, fileId }));
              toSave = { ...entry, fileId, audioOmitted: undefined };
            } catch (error) {
              // A final failure (too large, storage full) would fail forever:
              // keep the transcript instead. Anything else is retried later.
              const reason = audioOmittedReason(error);
              if (!reason) throw error;
              if (!hasWords(entry)) {
                deps.deleteFile(entry.uri);
                await this.update(entry.sessionId, () => null);
                continue;
              }
              await this.update(entry.sessionId, (current) => ({ ...current, audioOmitted: reason }));
              toSave = { ...entry, fileId: undefined, audioOmitted: reason };
            }
          }
          await deps.save(toSave);
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
