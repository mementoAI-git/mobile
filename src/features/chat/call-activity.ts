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

/**
 * Mirrors the live call into the iOS Live Activity (Dynamic Island and lock
 * screen). Starts it when the call connects, sends only real changes, and
 * ends it when the call ends. Native commands run one at a time, in order,
 * so a quick hang-up can never end the card before it has started. Native
 * failures never affect the call or block later commands.
 */
export class CallActivityController {
  private active = false;
  private lastKey = '';
  private queue: Promise<void> = Promise.resolve();

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

  sync(snapshot: CallActivitySnapshot): void {
    if (!this.adapter) return;
    if (!snapshot.isConnected) {
      if (!this.active) return;
      this.active = false;
      this.lastKey = '';
      this.run((adapter) => adapter.end());
      return;
    }

    const status = callActivityStatus(snapshot);
    const key = `${status}:${snapshot.isMuted}`;
    if (!this.active) {
      this.active = true;
      this.lastKey = key;
      const startedAtMs = this.now() - Math.max(0, snapshot.recordingTime) * 1_000;
      this.run((adapter) => adapter.start(startedAtMs, status, snapshot.isMuted));
      return;
    }
    if (key === this.lastKey) return;
    this.lastKey = key;
    this.run((adapter) => adapter.update(status, snapshot.isMuted));
  }

  /** Ends the card even when no call is live, e.g. a card left behind. */
  endNow(): void {
    this.active = false;
    this.lastKey = '';
    this.run((adapter) => adapter.end());
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
