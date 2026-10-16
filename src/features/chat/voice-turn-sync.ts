import type { VoiceTranscriptTurn } from './voice-transcript-turns';

export type VoiceTurnPayload = {
  index: number;
  role: 'user' | 'ai';
  text: string;
  interrupted?: boolean;
};

/** Called with the turns still unacknowledged whenever they change. */
export type VoiceTurnPendingListener = (pending: VoiceTurnPayload[], memoryId?: string) => void;

export type VoiceTurnPoster = (
  url: string,
  body: { session_id: string; memory_id?: string; turns: VoiceTurnPayload[] },
) => Promise<unknown>;

const MAX_BATCH = 50;

/**
 * Uploads completed voice turns in order. The server is idempotent on
 * (memory, session_id, index), so failed batches are simply retried.
 */
export class VoiceTurnSync {
  private nextIndex = 0;
  private pending: VoiceTurnPayload[] = [];
  private chain: Promise<boolean> = Promise.resolve(true);
  private memoryId?: string;

  constructor(
    private readonly post: VoiceTurnPoster,
    private readonly url: string,
    private readonly sessionId: string,
    memoryId?: string,
    private readonly onPendingChange?: VoiceTurnPendingListener,
  ) {
    this.memoryId = memoryId;
  }

  addTurns(
    turns: VoiceTranscriptTurn[],
    options: { interruptedLast?: boolean } = {},
  ): void {
    turns.forEach((turn, turnIndex) => {
      const isLastTurn = turnIndex === turns.length - 1;
      for (const message of turn.messages) {
        const text = message.text.trim();
        if (!text) continue;
        const interrupted =
          options.interruptedLast && isLastTurn && message.role === 'ai';
        this.pending.push({
          index: this.nextIndex++,
          role: message.role,
          text,
          ...(interrupted ? { interrupted: true } : {}),
        });
      }
    });
    if (this.pending.length) {
      this.notifyPending();
      void this.flush();
    }
  }

  flush(): Promise<boolean> {
    this.chain = this.chain.then(() => this.flushPending());
    return this.chain;
  }

  hasPending(): boolean {
    return this.pending.length > 0;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getMemoryId(): string | undefined {
    return this.memoryId;
  }

  private notifyPending(): void {
    this.onPendingChange?.([...this.pending], this.memoryId);
  }

  private async flushPending(): Promise<boolean> {
    while (this.pending.length) {
      const batch = this.pending.slice(0, MAX_BATCH);
      try {
        const response = await this.post(this.url, {
          session_id: this.sessionId,
          ...(this.memoryId ? { memory_id: this.memoryId } : {}),
          turns: batch,
        });
        const memoryId = (
          response as { data?: { memory_id?: unknown } } | undefined
        )?.data?.memory_id;
        if (typeof memoryId === 'string' && memoryId) this.memoryId = memoryId;
        this.pending.splice(0, batch.length);
        this.notifyPending();
      } catch {
        return false;
      }
    }
    return true;
  }
}