import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

export type RecordingActivityAction = 'togglePause' | 'stop';
type Subscription = { remove(): void };

export interface RecordingActivityAdapter {
  start(elapsedSeconds: number, isPaused: boolean): Promise<void>;
  update(elapsedSeconds: number, isPaused: boolean): Promise<void>;
  end(): Promise<void>;
  onAction(listener: (action: RecordingActivityAction) => void): Subscription;
  /** Asks iOS for time to finish an upload after the app leaves the screen; returns a key for `endBackgroundTask`. */
  beginBackgroundTask(): number | null;
  endBackgroundTask(key: number): void;
}

type RecordingActivityNativeModule = {
  isSupported(): boolean;
  startRecording(elapsed: number, isPaused: boolean): Promise<void>;
  updateRecording(elapsed: number, isPaused: boolean): Promise<void>;
  endRecording(): Promise<void>;
  beginBackgroundTask(): number;
  endBackgroundTask(key: number): void;
  addListener(eventName: 'onRecordingAction', listener: (event: { action: string }) => void): Subscription;
};

function isRecordingActivityAction(action: string): action is RecordingActivityAction {
  return action === 'togglePause' || action === 'stop';
}

/**
 * The recording card on the lock screen and Dynamic Island (iOS 17+, shares the call
 * Live Activity extension). Null on Android, older iOS and builds without the module.
 */
export function createRecordingActivityAdapter(platform: string): RecordingActivityAdapter | null {
  if (platform !== 'ios') return null;
  const { requireOptionalNativeModule } = require('expo') as typeof import('expo');
  const native = requireOptionalNativeModule<RecordingActivityNativeModule>('MementoCallActivity');
  if (!native || typeof native.startRecording !== 'function') return null;
  let supported = false;
  try { supported = native.isSupported(); } catch { /* Treated as unsupported. */ }
  return {
    start: (elapsed, isPaused) => (supported ? native.startRecording(elapsed, isPaused) : Promise.resolve()),
    update: (elapsed, isPaused) => (supported ? native.updateRecording(elapsed, isPaused) : Promise.resolve()),
    end: () => (supported ? native.endRecording() : Promise.resolve()),
    onAction: (listener) => (supported
      ? native.addListener('onRecordingAction', (event) => {
        if (isRecordingActivityAction(event.action)) listener(event.action);
      })
      : { remove() {} }),
    beginBackgroundTask: () => {
      try { return native.beginBackgroundTask(); } catch { return null; }
    },
    endBackgroundTask: (key) => {
      try { native.endBackgroundTask(key); } catch { /* Already finished. */ }
    },
  };
}

let sharedAdapter: RecordingActivityAdapter | null | undefined;
export function getRecordingActivityAdapter(): RecordingActivityAdapter | null {
  if (sharedAdapter === undefined) sharedAdapter = createRecordingActivityAdapter(Platform.OS);
  return sharedAdapter;
}

/**
 * Mirrors a live recording into the Live Activity: shown while recording or paused,
 * updated on pause and resume (the card's timer runs on its own), ended otherwise.
 * Native commands run one at a time, in order; failures never touch the recording.
 */
export class RecordingActivityController {
  private shown = false;
  private lastPaused = false;
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly adapter: RecordingActivityAdapter | null) {}

  idle(): Promise<void> {
    return this.queue;
  }

  private run(command: (adapter: RecordingActivityAdapter) => Promise<void>): void {
    const adapter = this.adapter;
    if (!adapter) return;
    this.queue = this.queue.then(() => command(adapter)).catch(() => undefined);
  }

  sync(live: boolean, isPaused: boolean, elapsedSeconds: number): void {
    if (!live) {
      if (this.shown) {
        this.shown = false;
        this.run((adapter) => adapter.end());
      }
      return;
    }
    if (!this.shown) {
      this.shown = true;
      this.lastPaused = isPaused;
      this.run((adapter) => adapter.start(elapsedSeconds, isPaused));
      return;
    }
    if (isPaused === this.lastPaused) return;
    this.lastPaused = isPaused;
    this.run((adapter) => adapter.update(elapsedSeconds, isPaused));
  }
}

/**
 * Shows the recording on the lock screen while `live`, and routes the card's
 * Pause/Resume and Stop buttons to the given handlers. Ends the card on unmount.
 */
export function useRecordingActivity({ live, isPaused, elapsedSeconds, onTogglePause, onStop }: {
  live: boolean;
  isPaused: boolean;
  elapsedSeconds: number;
  onTogglePause: () => void;
  onStop: () => void;
}) {
  const controller = useRef<RecordingActivityController | null>(null);
  if (!controller.current) controller.current = new RecordingActivityController(getRecordingActivityAdapter());
  const handlers = useRef({ onTogglePause, onStop });
  handlers.current = { onTogglePause, onStop };
  const elapsed = useRef(elapsedSeconds);
  elapsed.current = elapsedSeconds;

  useEffect(() => {
    controller.current?.sync(live, isPaused, elapsed.current);
  }, [isPaused, live]);

  useEffect(() => {
    const subscription = getRecordingActivityAdapter()?.onAction((action) => {
      if (action === 'togglePause') handlers.current.onTogglePause();
      else handlers.current.onStop();
    });
    const current = controller.current;
    return () => {
      subscription?.remove();
      current?.sync(false, false, 0);
    };
  }, []);
}
