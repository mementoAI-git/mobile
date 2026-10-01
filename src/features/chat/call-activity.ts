export type CallActivityStatus = 'listening' | 'speaking' | 'muted';
export type CallActivityAction = 'toggleMute' | 'end';

export type CallActivitySnapshot = {
  isConnected: boolean;
  isMuted: boolean;
  isAiSpeaking: boolean;
  /** Seconds the call has been running. */
  recordingTime: number;
};

export type CallActivitySubscription = { remove(): void };

export interface CallActivityAdapter {
  start(startedAtMs: number, status: CallActivityStatus, isMuted: boolean): Promise<void>;
  update(status: CallActivityStatus, isMuted: boolean): Promise<void>;
  end(): Promise<void>;
  onAction(listener: (action: CallActivityAction) => void): CallActivitySubscription;
}

export function callActivityStatus(snapshot: CallActivitySnapshot): CallActivityStatus {
  if (snapshot.isMuted) return 'muted';
  return snapshot.isAiSpeaking ? 'speaking' : 'listening';
}

type CallActivityState = { status: CallActivityStatus; isMuted: boolean };

/**
 * Mirrors the live call into the iOS Live Activity (Dynamic Island and lock
 * screen). Starts it when the call connects, sends only real changes, and
 * ends it when the call ends.
 *
 * - Native commands run one at a time, in order, so a quick hang-up can never
 *   end the card before it has started.
 * - Status changes that pile up behind a slow command merge into the latest
 *   one, and a hang-up drops any that haven't been sent.
 * - A failed start is final for that call: Live Activities don't become
 *   available mid-call, so updates are skipped until the next call.
 * - Native failures never affect the call or block later commands.
 */
export class CallActivityController {
  private active = false;
  private lastKey = '';
  private queue: Promise<void> = Promise.resolve();
  /** Increments per call, so work queued for an old call can tell it is stale. */
  private callId = 0;
  private startFailedFor = -1;
  private pendingUpdate: CallActivityState | null = null;

  constructor(
    private readonly adapter: CallActivityAdapter | null,
    private readonly now: () => number = Date.now,
  ) {}

  /** Resolves once every queued native command has finished. */
  idle(): Promise<void> {
    return this.queue;
  }

  private run(command: (adapter: CallActivityAdapter) => Promise<void>): void {
    const adapter = this.adapter;
    if (!adapter) return;
    this.queue = this.queue.then(() => command(adapter)).catch(() => undefined);
  }

  private queueUpdate(state: CallActivityState): void {
    const alreadyQueued = this.pendingUpdate !== null;
    this.pendingUpdate = state;
    if (alreadyQueued) return;
    const callId = this.callId;
    this.run(async (adapter) => {
      const latest = this.pendingUpdate;
      this.pendingUpdate = null;
      if (!latest || callId !== this.callId || this.startFailedFor === callId) return;
      await adapter.update(latest.status, latest.isMuted);
    });
  }

  private queueEnd(): void {
    this.active = false;
    this.lastKey = '';
    this.pendingUpdate = null;
    this.callId += 1;
    this.run((adapter) => adapter.end());
  }

  sync(snapshot: CallActivitySnapshot): void {
    if (!this.adapter) return;
    if (!snapshot.isConnected) {
      if (this.active) this.queueEnd();
      return;
    }

    const status = callActivityStatus(snapshot);
    const key = `${status}:${snapshot.isMuted}`;
    if (!this.active) {
      this.active = true;
      this.lastKey = key;
      const callId = this.callId;
      const startedAtMs = this.now() - Math.max(0, snapshot.recordingTime) * 1_000;
      this.run(async (adapter) => {
        try {
          await adapter.start(startedAtMs, status, snapshot.isMuted);
        } catch (error) {
          this.startFailedFor = callId;
          throw error;
        }
      });
      return;
    }
    if (key === this.lastKey) return;
    this.lastKey = key;
    this.queueUpdate({ status, isMuted: snapshot.isMuted });
  }

  /** Ends the card even when no call is live, e.g. a card left behind. */
  endNow(): void {
    this.queueEnd();
  }
}

type CallActivityNativeModule = {
  isSupported(): boolean;
  start(startedAtMs: number, status: CallActivityStatus, isMuted: boolean): Promise<void>;
  update(status: CallActivityStatus, isMuted: boolean): Promise<void>;
  end(): Promise<void>;
  addListener(
    eventName: 'onAction',
    listener: (event: { action: string }) => void,
  ): CallActivitySubscription;
};

function isCallActivityAction(action: string): action is CallActivityAction {
  return action === 'toggleMute' || action === 'end';
}

/** Null on Android, on iOS before 17, and when Live Activities are turned off. */
export function createCallActivityAdapter(platform: string): CallActivityAdapter | null {
  if (platform !== 'ios') return null;
  const { requireOptionalNativeModule } = require('expo') as typeof import('expo');
  const native = requireOptionalNativeModule<CallActivityNativeModule>('MementoCallActivity');
  if (!native) return null;
  try {
    if (!native.isSupported()) return null;
  } catch {
    return null;
  }
  return {
    start: (startedAtMs, status, isMuted) => native.start(startedAtMs, status, isMuted),
    update: (status, isMuted) => native.update(status, isMuted),
    end: () => native.end(),
    onAction: (listener) =>
      native.addListener('onAction', (event) => {
        if (isCallActivityAction(event.action)) listener(event.action);
      }),
  };
}
