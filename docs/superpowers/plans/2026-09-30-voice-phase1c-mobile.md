# Voice Phase 1c (Mobile) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the direct Gemini Live connection the reliability benefits LiveKit would bring, without LiveKit: calls that survive the background and network switches, a lighter JavaScript thread, mid-call memory lookup, and a server-controlled echo fallback.

**Architecture:** Five small, independently testable modules (`voice-throttle`, `voice-call-notification`, `voice-token-url`, `voice-tool-relay`, `voice-network`) hold all the logic and have unit tests. `use-voice-mode.ts` only wires them in. Each task adds one module and its wiring, and leaves the app building and every test passing.

**Tech Stack:** Expo 57, React Native 0.86, `@google/genai/web`, `react-native-audio-api` (recording notification and foreground service), `@react-native-community/netinfo`, `expo-device`, Bun test.

**Strategy:** `api/docs/superpowers/specs/2026-09-30-voice-experience-strategy.md`, Phase 1c.

## Global Constraints

- **Prerequisites:** `docs/superpowers/plans/2026-09-30-voice-stopgaps.md` Tasks 1 to 6 are merged in this repo. `api/docs/superpowers/plans/2026-09-30-voice-phase1c-api.md` is deployed before shipping Task 4 of this plan.
- Tests: `bun test <path>`. Types: `bun run typecheck`. Lint: `bun run lint`.
- **How to apply edits.** Every change to an existing file is written as "In `<file>`, find:" followed by a code block, then "Replace it with:" followed by a code block. The find text appears exactly once in the file at that point in the plan. Copy it exactly, including indentation. If a find text is not present, stop and report. Do not improvise a different edit.
- Every edit in this plan was replayed on 2026-09-30, in order, against a copy of this repo with the prerequisite plan applied. After each task: typecheck clean, `0 fail`.
- Do not refactor anything the plan does not mention. Most of this code is replaced if the project later moves to LiveKit.

## File Structure

| File | Responsibility |
| --- | --- |
| Create `src/features/chat/voice-throttle.ts` | Rate-limit transcript state updates |
| Create `src/features/chat/voice-call-notification.ts` | Android call notification that keeps the foreground service running |
| Create `src/features/chat/voice-token-url.ts` | Build the token URL with memory, resume handle, device model and capabilities |
| Create `src/features/chat/voice-tool-relay.ts` | Answer Gemini tool calls through the API |
| Create `src/features/chat/voice-network.ts` | Decide when a network change should trigger a reconnect |
| Modify `src/features/chat/voice-audio-engine.ts` | Stay alive in the background, apply the server duplex policy |
| Modify `src/features/chat/voice-session-metrics.ts` | Count backgrounding |
| Modify `src/features/chat/voice-live-config.ts` | Parse `tools` and `speakerFullDuplex` |
| Modify `src/features/chat/voice-message-handler.ts` | Emit tool-call effects |
| Modify `src/hooks/use-voice-mode.ts` | Wiring only |
| Modify `src/api/endpoint.ts`, `app.json` | New endpoint, foreground service config |

---

### Task 1: Throttle transcript updates on the call screen

Every transcript word currently calls `setState`, which re-renders the call screen on the same JavaScript thread that receives audio. Limit it to 10 updates a second, always showing the latest text.

**Files:**
- Create: `src/features/chat/voice-throttle.ts`
- Test: `src/features/chat/voice-throttle.test.ts`
- Modify: `src/hooks/use-voice-mode.ts`

**Interfaces:**
- Produces: `createThrottledSetter<T>(apply: (value: T) => void, intervalMs: number, scheduler?: ThrottleScheduler): ThrottledSetter<T>` with `set`, `flush`, and `cancel`

- [ ] **Step 1: Write the failing test**

Create `src/features/chat/voice-throttle.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';

import { createThrottledSetter, type ThrottleScheduler } from './voice-throttle';

function fakeScheduler() {
  let now = 0;
  const timers = new Map<number, { at: number; callback: () => void }>();
  let nextId = 1;
  const scheduler: ThrottleScheduler = {
    now: () => now,
    setTimeout: (callback, delayMs) => {
      const id = nextId++;
      timers.set(id, { at: now + delayMs, callback });
      return id;
    },
    clearTimeout: (timer) => {
      timers.delete(timer as number);
    },
  };
  const advance = (ms: number) => {
    now += ms;
    for (const [id, timer] of [...timers.entries()]) {
      if (timer.at <= now) {
        timers.delete(id);
        timer.callback();
      }
    }
  };
  return { scheduler, advance, pendingTimers: () => timers.size };
}

describe('createThrottledSetter', () => {
  test('applies the first value at once and coalesces the rest to the latest', () => {
    const { scheduler, advance } = fakeScheduler();
    const applied: string[] = [];
    const setter = createThrottledSetter((value: string) => applied.push(value), 100, scheduler);

    setter.set('a');
    setter.set('ab');
    setter.set('abc');
    expect(applied).toEqual(['a']);

    advance(100);
    expect(applied).toEqual(['a', 'abc']);

    advance(500);
    setter.set('abcd');
    expect(applied).toEqual(['a', 'abc', 'abcd']);
  });

  test('flush applies the pending value immediately', () => {
    const { scheduler, pendingTimers } = fakeScheduler();
    const applied: string[] = [];
    const setter = createThrottledSetter((value: string) => applied.push(value), 100, scheduler);

    setter.set('a');
    setter.set('final');
    setter.flush();

    expect(applied).toEqual(['a', 'final']);
    expect(pendingTimers()).toBe(0);
  });

  test('cancel drops the pending value', () => {
    const { scheduler, advance } = fakeScheduler();
    const applied: string[] = [];
    const setter = createThrottledSetter((value: string) => applied.push(value), 100, scheduler);

    setter.set('a');
    setter.set('dropped');
    setter.cancel();
    advance(1_000);

    expect(applied).toEqual(['a']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test src/features/chat/voice-throttle.test.ts`
Expected: FAIL with "Cannot find module './voice-throttle'".

- [ ] **Step 3: Write the implementation**

Create `src/features/chat/voice-throttle.ts`:

```ts
export type ThrottleScheduler = {
  now(): number;
  setTimeout(callback: () => void, delayMs: number): unknown;
  clearTimeout(timer: unknown): void;
};

const defaultScheduler: ThrottleScheduler = {
  now: () => Date.now(),
  setTimeout: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
  clearTimeout: (timer) =>
    globalThis.clearTimeout(timer as ReturnType<typeof globalThis.setTimeout>),
};

export type ThrottledSetter<T> = {
  set(value: T): void;
  flush(): void;
  cancel(): void;
};

/**
 * Applies the first value immediately, then at most one value per interval,
 * always the latest. Keeps per-word transcript updates from re-rendering the
 * call screen dozens of times a second on the JS thread that also carries audio.
 */
export function createThrottledSetter<T>(
  apply: (value: T) => void,
  intervalMs: number,
  scheduler: ThrottleScheduler = defaultScheduler,
): ThrottledSetter<T> {
  let lastAppliedAt = Number.NEGATIVE_INFINITY;
  let pending: { value: T } | undefined;
  let timer: unknown;

  const clearTimer = () => {
    if (timer !== undefined) scheduler.clearTimeout(timer);
    timer = undefined;
  };

  const run = () => {
    timer = undefined;
    if (!pending) return;
    const { value } = pending;
    pending = undefined;
    lastAppliedAt = scheduler.now();
    apply(value);
  };

  return {
    set(value: T) {
      pending = { value };
      const waitMs = lastAppliedAt + intervalMs - scheduler.now();
      if (waitMs <= 0) {
        clearTimer();
        run();
      } else if (timer === undefined) {
        timer = scheduler.setTimeout(run, waitMs);
      }
    },
    flush() {
      clearTimer();
      run();
    },
    cancel() {
      clearTimer();
      pending = undefined;
    },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test src/features/chat/voice-throttle.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Wire it into the hook**

In `src/hooks/use-voice-mode.ts`, find:

```ts
import { VoiceTurnSync } from '@/features/chat/voice-turn-sync';
```

Replace it with:

```ts
import { VoiceTurnSync } from '@/features/chat/voice-turn-sync';
import { createThrottledSetter, type ThrottledSetter } from '@/features/chat/voice-throttle';
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
const TRANSCRIPT_SETTLE_MS = 600;
```

Replace it with:

```ts
const TRANSCRIPT_SETTLE_MS = 600;
const TRANSCRIPT_UI_INTERVAL_MS = 100;
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
  const turnSyncRef = useRef<VoiceTurnSync | null>(null);
```

Replace it with:

```ts
  const turnSyncRef = useRef<VoiceTurnSync | null>(null);
  const userTextSetterRef = useRef<ThrottledSetter<string> | null>(null);
  const aiTextSetterRef = useRef<ThrottledSetter<string> | null>(null);
  if (!userTextSetterRef.current) {
    userTextSetterRef.current = createThrottledSetter((text: string) => {
      if (isMountedRef.current) setUserSpeechText(text);
    }, TRANSCRIPT_UI_INTERVAL_MS);
  }
  if (!aiTextSetterRef.current) {
    aiTextSetterRef.current = createThrottledSetter((text: string) => {
      if (isMountedRef.current) setAiSpeechText(text);
    }, TRANSCRIPT_UI_INTERVAL_MS);
  }
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
          if (isMountedRef.current) setUserSpeechText(text);
```

Replace it with:

```ts
          userTextSetterRef.current?.set(text);
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
            if (isMountedRef.current) setAiSpeechText(text);
```

Replace it with:

```ts
            aiTextSetterRef.current?.set(text);
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
    setAiSpeechText('Connecting secure voice link...');
```

Replace it with:

```ts
    userTextSetterRef.current?.cancel();
    aiTextSetterRef.current?.cancel();
    setAiSpeechText('Connecting secure voice link...');
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
    if (isMountedRef.current) {
      setIsConnected(false);
      setIsConnecting(false);
```

Replace it with:

```ts
    userTextSetterRef.current?.flush();
    aiTextSetterRef.current?.flush();
    if (isMountedRef.current) {
      setIsConnected(false);
      setIsConnecting(false);
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
      isMountedRef.current = false;
      void disconnectRef.current();
```

Replace it with:

```ts
      isMountedRef.current = false;
      userTextSetterRef.current?.cancel();
      aiTextSetterRef.current?.cancel();
      void disconnectRef.current();
```

- [ ] **Step 6: Verify**

Run: `bun run typecheck && bun test src/features/chat`
Expected: no type errors, `0 fail`.

- [ ] **Step 7: Commit**

```bash
git add src/features/chat/voice-throttle.ts src/features/chat/voice-throttle.test.ts src/hooks/use-voice-mode.ts
git commit -m "perf(voice): throttle transcript updates on the call screen"
```

---

### Task 2: Keep calls alive in the background

iOS already declares `UIBackgroundModes: audio`, and the voice-chat audio session keeps running when the screen locks. The engine currently ends the call on purpose when the app backgrounds. Stop doing that. On Android, a recording notification from `react-native-audio-api` starts its foreground service with the microphone type. That keeps the process and microphone alive, and the notification's stop button ends the call.

**Files:**
- Create: `src/features/chat/voice-call-notification.ts`
- Test: `src/features/chat/voice-call-notification.test.ts`
- Modify: `src/features/chat/voice-session-metrics.ts`, `src/features/chat/voice-session-metrics.test.ts`
- Modify: `src/features/chat/voice-audio-engine.ts`, `src/features/chat/voice-audio-engine.test.ts`
- Modify: `app.json`, `src/features/chat/native-voice-runtime-contract.test.ts`, `src/features/chat/voice-provider-contract.test.ts`
- Modify: `src/hooks/use-voice-mode.ts`

**Interfaces:**
- Produces: `VoiceCallNotification` with `start(onStop)` and `stop()`, `createCallNotificationAdapter(platform: string): CallNotificationAdapter | null`, and `VoiceSessionMetrics.markBackgrounded()` with snapshot field `backgroundedCount`

- [ ] **Step 1: Write the failing test**

Create `src/features/chat/voice-call-notification.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';

import {
  VoiceCallNotification,
  type CallNotificationAdapter,
  type CallNotificationInfo,
} from './voice-call-notification';

function fakeAdapter(options: { failShow?: boolean } = {}) {
  const calls: string[] = [];
  let stopListener: (() => void) | undefined;
  const adapter: CallNotificationAdapter = {
    async show(info: CallNotificationInfo) {
      calls.push(`show:${info.title}:${info.showStopAction}`);
      if (options.failShow) throw new Error('notifications blocked');
    },
    async hide() {
      calls.push('hide');
    },
    onStop(listener) {
      calls.push('subscribe');
      stopListener = listener;
      return { remove: () => calls.push('unsubscribe') };
    },
  };
  return { adapter, calls, pressStop: () => stopListener?.() };
}

describe('VoiceCallNotification', () => {
  test('shows once, relays the stop action, and cleans up once', async () => {
    const { adapter, calls, pressStop } = fakeAdapter();
    const notification = new VoiceCallNotification(adapter);
    let stopped = 0;

    await notification.start(() => {
      stopped += 1;
    });
    await notification.start(() => undefined);
    pressStop();
    await notification.stop();
    await notification.stop();

    expect(stopped).toBe(1);
    expect(calls).toEqual(['subscribe', 'show:Memento voice call:true', 'unsubscribe', 'hide']);
  });

  test('never throws when the notification cannot be shown', async () => {
    const { adapter } = fakeAdapter({ failShow: true });
    const notification = new VoiceCallNotification(adapter);

    await expect(notification.start(() => undefined)).resolves.toBeUndefined();
    await expect(notification.stop()).resolves.toBeUndefined();
  });

  test('is a no-op without an adapter (iOS)', async () => {
    const notification = new VoiceCallNotification(null);

    await expect(notification.start(() => undefined)).resolves.toBeUndefined();
    await expect(notification.stop()).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test src/features/chat/voice-call-notification.test.ts`
Expected: FAIL with "Cannot find module './voice-call-notification'".

- [ ] **Step 3: Write the implementation**

Create `src/features/chat/voice-call-notification.ts`:

```ts
export type CallNotificationSubscription = { remove(): void };

export type CallNotificationInfo = {
  title: string;
  contentText: string;
  showStopAction: boolean;
};

export interface CallNotificationAdapter {
  show(info: CallNotificationInfo): Promise<void>;
  hide(): Promise<void>;
  onStop(listener: () => void): CallNotificationSubscription;
}

const CALL_NOTIFICATION: CallNotificationInfo = {
  title: 'Memento voice call',
  contentText: 'Tap to return to your conversation',
  showStopAction: true,
};

/**
 * Keeps an Android voice call alive in the background. Showing the
 * react-native-audio-api recording notification starts its foreground
 * service with the microphone type. iOS needs nothing: UIBackgroundModes
 * `audio` keeps the active voice-chat audio session running.
 */
export class VoiceCallNotification {
  private subscription?: CallNotificationSubscription;
  private active = false;

  constructor(private readonly adapter: CallNotificationAdapter | null) {}

  async start(onStop: () => void): Promise<void> {
    if (!this.adapter || this.active) return;
    this.active = true;
    this.subscription = this.adapter.onStop(onStop);
    try {
      await this.adapter.show(CALL_NOTIFICATION);
    } catch {
      // Without the notification the call still works while the app is open.
    }
  }

  async stop(): Promise<void> {
    if (!this.adapter || !this.active) return;
    this.active = false;
    this.subscription?.remove();
    this.subscription = undefined;
    try {
      await this.adapter.hide();
    } catch {
      // Already hidden.
    }
  }
}

export function createCallNotificationAdapter(platform: string): CallNotificationAdapter | null {
  if (platform !== 'android') return null;
  const { RecordingNotificationManager } =
    require('react-native-audio-api') as typeof import('react-native-audio-api');
  return {
    show: (info) => RecordingNotificationManager.show(info),
    hide: () => RecordingNotificationManager.hide(),
    onStop: (listener) =>
      RecordingNotificationManager.addEventListener('recordingNotificationStop', () => listener()),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test src/features/chat/voice-call-notification.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Count backgrounding in the session metrics**

In `src/features/chat/voice-session-metrics.ts`, find:

```ts
  routeChanges: number;
```

Replace it with:

```ts
  routeChanges: number;
  backgroundedCount: number;
```

In `src/features/chat/voice-session-metrics.ts`, find:

```ts
  private routeChangeCount = 0;
```

Replace it with:

```ts
  private routeChangeCount = 0;
  private backgroundedCount = 0;
```

In `src/features/chat/voice-session-metrics.ts`, find:

```ts
  markRouteChange(): void {
```

Replace it with:

```ts
  markBackgrounded(): void {
    this.backgroundedCount += 1;
  }

  markRouteChange(): void {
```

In `src/features/chat/voice-session-metrics.ts`, find:

```ts
      routeChanges: this.routeChangeCount,
```

Replace it with:

```ts
      routeChanges: this.routeChangeCount,
      backgroundedCount: this.backgroundedCount,
```

In `src/features/chat/voice-session-metrics.test.ts`, find:

```ts
      routeChanges: 1,
      routeRebuilds: 1,
```

Replace it with:

```ts
      routeChanges: 1,
      backgroundedCount: 0,
      routeRebuilds: 1,
```

- [ ] **Step 6: Stop ending the call on background**

In `src/features/chat/voice-audio-engine.test.ts`, find:

```ts
  test('cleans up exactly once when backgrounded and when stop repeats', async () => {
    const native = new FakeNative();
    const failures: Error[] = [];
    const engine = new VoiceAudioEngine({ native, onFatalError: (error) => failures.push(error) });
    await engine.start(() => {});

    await engine.handleAppState('background');
    await engine.stop();

    expect(failures).toHaveLength(1);
```

Replace it with:

```ts
  test('keeps running in the background and cleans up exactly once when stop repeats', async () => {
    const native = new FakeNative();
    const failures: Error[] = [];
    const engine = new VoiceAudioEngine({ native, onFatalError: (error) => failures.push(error) });
    await engine.start(() => {});

    await engine.handleAppState('background');
    expect(failures).toHaveLength(0);
    expect(native.calls).not.toContain('recorder.stop');
    await engine.stop();
    await engine.stop();

    expect(failures).toHaveLength(0);
```

Run: `bun test src/features/chat/voice-audio-engine.test.ts`
Expected: that test FAILS, because background still ends the call.

In `src/features/chat/voice-audio-engine.ts`, find:

```ts
  async handleAppState(state: string): Promise<void> {
    if (state === 'background') {
      await this.fail(new Error('Voice mode ended when Memento moved to the background.'));
    }
  }
```

Replace it with:

```ts
  async handleAppState(state: string): Promise<void> {
    // Calls continue in the background. iOS keeps the voice-chat audio session
    // alive (UIBackgroundModes audio) and Android runs a microphone foreground
    // service while the call notification is shown.
    if (state === 'background') this.metrics.markBackgrounded();
  }
```

- [ ] **Step 7: Configure the Android foreground service**

In `app.json`, find:

```json
        {
          "iosMicrophonePermission": "Allow Memento to access your microphone for voice conversations.",
          "androidPermissions": [
            "android.permission.RECORD_AUDIO",
            "android.permission.MODIFY_AUDIO_SETTINGS"
          ]
        }
```

Replace it with:

```json
        {
          "iosMicrophonePermission": "Allow Memento to access your microphone for voice conversations.",
          "iosBackgroundMode": true,
          "androidPermissions": [
            "android.permission.RECORD_AUDIO",
            "android.permission.MODIFY_AUDIO_SETTINGS",
            "android.permission.FOREGROUND_SERVICE",
            "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
            "android.permission.FOREGROUND_SERVICE_MICROPHONE",
            "android.permission.POST_NOTIFICATIONS"
          ],
          "androidForegroundService": true,
          "androidFSTypes": ["mediaPlayback", "microphone"]
        }
```

In `src/features/chat/native-voice-runtime-contract.test.ts`, find:

```ts
      {
        iosMicrophonePermission:
          'Allow Memento to access your microphone for voice conversations.',
        androidPermissions: [
          'android.permission.RECORD_AUDIO',
          'android.permission.MODIFY_AUDIO_SETTINGS',
        ],
      },
```

Replace it with:

```ts
      {
        iosMicrophonePermission:
          'Allow Memento to access your microphone for voice conversations.',
        iosBackgroundMode: true,
        androidPermissions: [
          'android.permission.RECORD_AUDIO',
          'android.permission.MODIFY_AUDIO_SETTINGS',
          'android.permission.FOREGROUND_SERVICE',
          'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
          'android.permission.FOREGROUND_SERVICE_MICROPHONE',
          'android.permission.POST_NOTIFICATIONS',
        ],
        androidForegroundService: true,
        androidFSTypes: ['mediaPlayback', 'microphone'],
      },
```

- [ ] **Step 8: Wire it into the hook**

In `src/hooks/use-voice-mode.ts`, find:

```ts
import * as Haptics from 'expo-haptics';
```

Replace it with:

```ts
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
import { createThrottledSetter, type ThrottledSetter } from '@/features/chat/voice-throttle';
```

Replace it with:

```ts
import {
  createCallNotificationAdapter,
  VoiceCallNotification,
} from '@/features/chat/voice-call-notification';
import { createThrottledSetter, type ThrottledSetter } from '@/features/chat/voice-throttle';
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
  const userTextSetterRef = useRef<ThrottledSetter<string> | null>(null);
```

Replace it with:

```ts
  const callNotificationRef = useRef<VoiceCallNotification | null>(null);
  if (!callNotificationRef.current) {
    callNotificationRef.current = new VoiceCallNotification(
      createCallNotificationAdapter(Platform.OS),
    );
  }
  const userTextSetterRef = useRef<ThrottledSetter<string> | null>(null);
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
    isMutedRef.current = true;
```

Replace it with:

```ts
    isMutedRef.current = true;
    void callNotificationRef.current?.stop();
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
      if (isMountedRef.current) {
        setIsConnected(true);
        setIsConnecting(false);
      }
```

Replace it with:

```ts
      void callNotificationRef.current?.start(() => {
        void disconnectRef.current();
      });
      if (isMountedRef.current) {
        setIsConnected(true);
        setIsConnecting(false);
      }
```

- [ ] **Step 9: Update the source contract test**

In `src/features/chat/voice-provider-contract.test.ts`, find:

```ts
  test('disconnects on background and makes native close callbacks idempotent', async () => {
    const hook = await Bun.file(new URL('../../hooks/use-voice-mode.ts', import.meta.url)).text();
    const engine = await Bun.file(new URL('./voice-audio-engine.ts', import.meta.url)).text();

    expect(engine).toContain("if (state === 'background')");
    expect(engine).not.toContain("state === 'active'");
```

Replace it with:

```ts
  test('keeps calls alive in the background and makes native close callbacks idempotent', async () => {
    const hook = await Bun.file(new URL('../../hooks/use-voice-mode.ts', import.meta.url)).text();
    const engine = await Bun.file(new URL('./voice-audio-engine.ts', import.meta.url)).text();

    expect(engine).toContain("if (state === 'background')");
    expect(engine).not.toContain('Voice mode ended when Memento moved to the background');
    expect(hook).toContain('callNotificationRef.current?.start(');
    expect(hook).toContain('callNotificationRef.current?.stop()');
```

- [ ] **Step 10: Verify**

Run: `bun run typecheck && bun test`
Expected: no type errors, `0 fail` across the whole suite. The runtime contract and metrics tests are included.

- [ ] **Step 11: Commit**

```bash
git add src/features/chat/voice-call-notification.ts src/features/chat/voice-call-notification.test.ts src/features/chat/voice-session-metrics.ts src/features/chat/voice-session-metrics.test.ts src/features/chat/voice-audio-engine.ts src/features/chat/voice-audio-engine.test.ts app.json src/features/chat/native-voice-runtime-contract.test.ts src/features/chat/voice-provider-contract.test.ts src/hooks/use-voice-mode.ts
git commit -m "feat(voice): keep calls alive in the background"
```

---

### Task 3: Token URL, device model, and the server echo policy

**Files:**
- Create: `src/features/chat/voice-token-url.ts`
- Test: `src/features/chat/voice-token-url.test.ts`
- Modify: `src/features/chat/voice-live-config.ts`, `src/features/chat/voice-live-config.test.ts`
- Modify: `src/features/chat/voice-audio-engine.ts`, `src/features/chat/voice-audio-engine.test.ts`
- Modify: `src/hooks/use-voice-mode.ts`

**Interfaces:**
- Consumes: token response `data.speakerFullDuplex` and `data.tools` from API Phase 1c Tasks 4 and 5
- Produces:
  - `buildEphemeralTokenUrl(base: string, params: {memoryId?, resumeHandle?, deviceModel?, capabilities?}): string`
  - `VoiceLiveToken.tools?: string[]` and `VoiceLiveToken.speakerFullDuplex?: boolean`
  - `VoiceAudioEngine.setSpeakerFullDuplex(enabled: boolean): void`

- [ ] **Step 1: Write the failing tests**

Create `src/features/chat/voice-token-url.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';

import { buildEphemeralTokenUrl } from './voice-token-url';

describe('buildEphemeralTokenUrl', () => {
  test('returns the bare endpoint without parameters', () => {
    expect(buildEphemeralTokenUrl('/ai/ephemeral-token', {})).toBe('/ai/ephemeral-token');
  });

  test('encodes every parameter', () => {
    const url = buildEphemeralTokenUrl('/ai/ephemeral-token', {
      memoryId: '64b000000000000000000001',
      resumeHandle: 'a/b+c=',
      deviceModel: 'Pixel 8 Pro',
      capabilities: ['memory_search'],
    });
    const params = new URL(`https://x${url}`).searchParams;

    expect(url.startsWith('/ai/ephemeral-token?')).toBe(true);
    expect(params.get('memory_id')).toBe('64b000000000000000000001');
    expect(params.get('resume_handle')).toBe('a/b+c=');
    expect(params.get('device_model')).toBe('Pixel 8 Pro');
    expect(params.get('capabilities')).toBe('memory_search');
  });
});
```

Append inside the `describe` of `src/features/chat/voice-live-config.test.ts`:

```ts
  test('parses tools and the speaker duplex policy when the API sends them', () => {
    const parsed = parseVoiceLiveToken(
      { token: 't', tools: ['search_memories', 7], speakerFullDuplex: false },
      'Fenrir',
    );

    expect(parsed.tools).toEqual(['search_memories']);
    expect(parsed.speakerFullDuplex).toBe(false);
    expect(parseVoiceLiveToken({ token: 't' }, 'Fenrir').speakerFullDuplex).toBeUndefined();
  });
```

Append inside the `describe` of `src/features/chat/voice-audio-engine.test.ts`:

```ts
  test('applies the server speaker duplex policy after construction', async () => {
    const native = new FakeNative();
    native.isHeadphonesDevice = false;
    const chunks: string[] = [];
    const engine = new VoiceAudioEngine({ native });

    await engine.start((chunk) => chunks.push(chunk));
    engine.armGreetingShield();
    engine.setSpeakerFullDuplex(true);

    const pcmSamples = new Float32Array(4800).fill(0.1);
    engine.enqueueOutput(btoa(String.fromCharCode(...new Uint8Array(pcmSamples.length * 2))), 1);
    native.recorder.input?.({
      buffer: { getChannelData: () => new Float32Array(1_600).fill(0.1) },
      numFrames: 1_600,
    });

    expect(chunks).toHaveLength(1);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test src/features/chat/voice-token-url.test.ts src/features/chat/voice-live-config.test.ts src/features/chat/voice-audio-engine.test.ts`
Expected: the token URL file FAILS to import. The new parse test fails on `tools`. The new engine test fails with `setSpeakerFullDuplex is not a function`.

- [ ] **Step 3: Write the token URL builder**

Create `src/features/chat/voice-token-url.ts`:

```ts
export type EphemeralTokenParams = {
  memoryId?: string | null;
  resumeHandle?: string | null;
  deviceModel?: string | null;
  capabilities?: string[];
};

export function buildEphemeralTokenUrl(base: string, params: EphemeralTokenParams): string {
  const search = new URLSearchParams();
  if (params.memoryId) search.set('memory_id', params.memoryId);
  if (params.resumeHandle) search.set('resume_handle', params.resumeHandle);
  if (params.deviceModel) search.set('device_model', params.deviceModel);
  if (params.capabilities?.length) search.set('capabilities', params.capabilities.join(','));
  const query = search.toString();
  return query ? `${base}?${query}` : base;
}
```

- [ ] **Step 4: Parse the new token fields**

In `src/features/chat/voice-live-config.ts`, find:

```ts
  /** True when the API records voice turns via POST /ai/voice/turns. */
  supportsVoiceTurns: boolean;
};
```

Replace it with:

```ts
  /** True when the API records voice turns via POST /ai/voice/turns. */
  supportsVoiceTurns: boolean;
  /** Tools the API locked into this session, for example ['search_memories']. */
  tools?: string[];
  /** Server device policy. Undefined on APIs that predate it. */
  speakerFullDuplex?: boolean;
};
```

In `src/features/chat/voice-live-config.ts`, find:

```ts
    supportsVoiceTurns: nonEmptyString(response.promptVersion),
  };
```

Replace it with:

```ts
    supportsVoiceTurns: nonEmptyString(response.promptVersion),
    tools: Array.isArray(response.tools)
      ? response.tools.filter((tool): tool is string => typeof tool === 'string')
      : undefined,
    speakerFullDuplex:
      typeof response.speakerFullDuplex === 'boolean' ? response.speakerFullDuplex : undefined,
  };
```

- [ ] **Step 5: Let the engine change duplex mode after construction**

In `src/features/chat/voice-audio-engine.ts`, find:

```ts
  private readonly speakerFullDuplex: boolean;
```

Replace it with:

```ts
  private speakerFullDuplex: boolean;
```

In `src/features/chat/voice-audio-engine.ts`, find:

```ts
  armGreetingShield(): void {
```

Replace it with:

```ts
  /** Apply the server's device policy once the token arrives. */
  setSpeakerFullDuplex(enabled: boolean): void {
    this.speakerFullDuplex = enabled;
    if (enabled) this.greetingShieldActive = false;
  }

  armGreetingShield(): void {
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `bun test src/features/chat/voice-token-url.test.ts src/features/chat/voice-live-config.test.ts src/features/chat/voice-audio-engine.test.ts`
Expected: PASS.

- [ ] **Step 7: Wire it into the hook**

In `src/hooks/use-voice-mode.ts`, find:

```ts
import * as Haptics from 'expo-haptics';
```

Replace it with:

```ts
import * as Device from 'expo-device';
import * as Haptics from 'expo-haptics';
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
import { createThrottledSetter, type ThrottledSetter } from '@/features/chat/voice-throttle';
```

Replace it with:

```ts
import { createThrottledSetter, type ThrottledSetter } from '@/features/chat/voice-throttle';
import { buildEphemeralTokenUrl } from '@/features/chat/voice-token-url';
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
  const callNotificationRef = useRef<VoiceCallNotification | null>(null);
```

Replace it with:

```ts
  const fullDuplexRef = useRef(SPEAKER_FULL_DUPLEX);
  const callNotificationRef = useRef<VoiceCallNotification | null>(null);
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
            const params = new URLSearchParams({ resume_handle: resumeHandleRef.current! });
            if (memoryIdRef.current) params.set('memory_id', memoryIdRef.current);
            const tokenResponse = await get<unknown>(`${endpoint.ephemeralToken}?${params}`);
```

Replace it with:

```ts
            const tokenResponse = await get<unknown>(
              buildEphemeralTokenUrl(endpoint.ephemeralToken, {
                resumeHandle: resumeHandleRef.current,
                memoryId: memoryIdRef.current,
                deviceModel: Device.modelName,
              }),
            );
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
      const url = memoryId
        ? `${endpoint.ephemeralToken}?memory_id=${encodeURIComponent(memoryId)}`
        : endpoint.ephemeralToken;
      const tokenResponse = await get<unknown>(url);
```

Replace it with:

```ts
      const tokenResponse = await get<unknown>(
        buildEphemeralTokenUrl(endpoint.ephemeralToken, {
          memoryId,
          deviceModel: Device.modelName,
        }),
      );
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
      if (liveToken.memoryId) memoryIdRef.current = liveToken.memoryId;
```

Replace it with:

```ts
      if (liveToken.memoryId) memoryIdRef.current = liveToken.memoryId;
      // The server can switch specific device models back to the speaker mic gate.
      const fullDuplex = SPEAKER_FULL_DUPLEX && liveToken.speakerFullDuplex !== false;
      fullDuplexRef.current = fullDuplex;
      engine.setSpeakerFullDuplex(fullDuplex);
      isGreetingActiveRef.current = !fullDuplex;
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
      if (!SPEAKER_FULL_DUPLEX) {
```

Replace it with:

```ts
      if (!fullDuplexRef.current) {
```

- [ ] **Step 8: Verify**

Run: `bun run typecheck && bun test src/features/chat`
Expected: no type errors, `0 fail`.

- [ ] **Step 9: Commit**

```bash
git add src/features/chat/voice-token-url.ts src/features/chat/voice-token-url.test.ts src/features/chat/voice-live-config.ts src/features/chat/voice-live-config.test.ts src/features/chat/voice-audio-engine.ts src/features/chat/voice-audio-engine.test.ts src/hooks/use-voice-mode.ts
git commit -m "feat(voice): send device model and honor the server echo policy"
```

---

### Task 4: Relay memory search tool calls

The API locks the `search_memories` tool into the session only when the app asks for it with `capabilities=memory_search`. This task adds the relay and starts asking for it. The two must ship together: a session with the tool and no relay leaves the model waiting for an answer that never comes.

**Files:**
- Create: `src/features/chat/voice-tool-relay.ts`
- Test: `src/features/chat/voice-tool-relay.test.ts`
- Modify: `src/features/chat/voice-message-handler.ts`, `src/features/chat/voice-message-handler.test.ts`
- Modify: `src/api/endpoint.ts`
- Modify: `src/hooks/use-voice-mode.ts`

**Interfaces:**
- Consumes: `POST /ai/voice/memory-search` from API Phase 1c Task 3, and `VoiceLiveToken.tools` from Task 3
- Produces: `VoiceToolRelay`, `SEARCH_MEMORIES_TOOL`, and `VoiceMessageEffect` variants `{ type: 'tool-call'; calls }` and `{ type: 'tool-call-cancellation'; ids }`

- [ ] **Step 1: Write the failing tests**

Create `src/features/chat/voice-tool-relay.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';

import {
  MEMORY_SEARCH_UNAVAILABLE,
  VoiceToolRelay,
  type VoiceToolResponse,
} from './voice-tool-relay';

function relay(search: (query: string) => Promise<string>) {
  const sent: VoiceToolResponse[][] = [];
  const queries: string[] = [];
  const instance = new VoiceToolRelay(
    async (query) => {
      queries.push(query);
      return search(query);
    },
    (responses) => sent.push(responses),
  );
  return { instance, sent, queries };
}

describe('VoiceToolRelay', () => {
  test('answers search_memories with the API result', async () => {
    const { instance, sent, queries } = relay(async () => 'Grandma lived in Ogun.');

    await instance.handle([{ id: 'c1', name: 'search_memories', args: { query: '  grandma  ' } }]);

    expect(queries).toEqual(['grandma']);
    expect(sent).toEqual([
      [{ id: 'c1', name: 'search_memories', response: { result: 'Grandma lived in Ogun.' } }],
    ]);
  });

  test('always responds, even when the search fails or the call is malformed', async () => {
    const { instance, sent } = relay(async () => {
      throw new Error('offline');
    });

    await instance.handle([
      { id: 'a', name: 'search_memories', args: { query: 'x' } },
      { id: 'b', name: 'search_memories', args: {} },
      { id: 'c', name: 'unknown_tool', args: {} },
    ]);

    expect(sent[0].map((response) => response.response.result)).toEqual([
      MEMORY_SEARCH_UNAVAILABLE,
      'No search query was given.',
      'Unknown tool unknown_tool.',
    ]);
  });

  test('drops responses for calls Gemini cancelled', async () => {
    let release!: (value: string) => void;
    const { instance, sent } = relay(
      () =>
        new Promise<string>((resolve) => {
          release = resolve;
        }),
    );

    const pending = instance.handle([{ id: 'c1', name: 'search_memories', args: { query: 'x' } }]);
    instance.cancel(['c1']);
    release('late');
    await pending;

    expect(sent).toEqual([]);
  });
});
```

Append inside the `describe` of `src/features/chat/voice-message-handler.test.ts`:

```ts
  test('emits tool calls and cancellations', () => {
    const handler = new VoiceMessageHandler();

    expect(
      handler.handle(
        {
          toolCall: {
            functionCalls: [
              { id: 'c1', name: 'search_memories', args: { query: 'farm' } },
              { id: 'c2', name: 'search_memories' },
            ],
          },
        } as any,
        1,
      ),
    ).toEqual([
      {
        type: 'tool-call',
        calls: [
          { id: 'c1', name: 'search_memories', args: { query: 'farm' } },
          { id: 'c2', name: 'search_memories', args: {} },
        ],
      },
    ]);
    expect(handler.handle({ toolCallCancellation: { ids: ['c1'] } } as any, 1)).toEqual([
      { type: 'tool-call-cancellation', ids: ['c1'] },
    ]);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test src/features/chat/voice-tool-relay.test.ts src/features/chat/voice-message-handler.test.ts`
Expected: the relay file FAILS to import, and the handler test receives `[]`.

- [ ] **Step 3: Write the relay**

Create `src/features/chat/voice-tool-relay.ts`:

```ts
export const SEARCH_MEMORIES_TOOL = 'search_memories';

export const MEMORY_SEARCH_UNAVAILABLE =
  'Memory search is unavailable right now. Continue the conversation without it.';

export type VoiceToolCall = {
  id?: string;
  name: string;
  args: Record<string, unknown>;
};

export type VoiceToolResponse = {
  id?: string;
  name: string;
  response: { result: string };
};

/**
 * Answers Gemini Live function calls from the phone. The model waits for a
 * response, so every call gets one, even on failure, unless Gemini cancels it.
 */
export class VoiceToolRelay {
  private readonly cancelled = new Set<string>();

  constructor(
    private readonly searchMemories: (query: string) => Promise<string>,
    private readonly send: (responses: VoiceToolResponse[]) => void,
  ) {}

  async handle(calls: VoiceToolCall[]): Promise<void> {
    const responses = await Promise.all(calls.map((call) => this.respond(call)));
    const live = responses.filter((response) => !response.id || !this.cancelled.has(response.id));
    if (live.length) this.send(live);
  }

  cancel(ids: string[]): void {
    for (const id of ids) this.cancelled.add(id);
  }

  private async respond(call: VoiceToolCall): Promise<VoiceToolResponse> {
    const reply = (result: string): VoiceToolResponse => ({
      id: call.id,
      name: call.name,
      response: { result },
    });
    if (call.name !== SEARCH_MEMORIES_TOOL) return reply(`Unknown tool ${call.name}.`);
    const query = typeof call.args?.query === 'string' ? call.args.query.trim() : '';
    if (!query) return reply('No search query was given.');
    try {
      const result = await this.searchMemories(query.slice(0, 200));
      return reply(result.trim() || MEMORY_SEARCH_UNAVAILABLE);
    } catch {
      return reply(MEMORY_SEARCH_UNAVAILABLE);
    }
  }
}
```

- [ ] **Step 4: Emit tool effects from the message handler**

In `src/features/chat/voice-message-handler.ts`, find:

```ts
import type { LiveServerMessage } from '@google/genai/web';
```

Replace it with:

```ts
import type { LiveServerMessage } from '@google/genai/web';

import type { VoiceToolCall } from './voice-tool-relay';
```

In `src/features/chat/voice-message-handler.ts`, find:

```ts
  | { type: 'go-away'; timeLeftMs: number };
```

Replace it with:

```ts
  | { type: 'go-away'; timeLeftMs: number }
  | { type: 'tool-call'; calls: VoiceToolCall[] }
  | { type: 'tool-call-cancellation'; ids: string[] };
```

In `src/features/chat/voice-message-handler.ts`, find:

```ts
    const content = message.serverContent ?? message.server_content;
    if (!content || typeof content !== 'object') return effects;

    if (content.interrupted) {
```

Replace it with:

```ts
    const toolCall = message.toolCall ?? message.tool_call;
    const functionCalls = toolCall?.functionCalls ?? toolCall?.function_calls;
    if (Array.isArray(functionCalls) && functionCalls.length) {
      effects.push({
        type: 'tool-call',
        calls: functionCalls
          .filter((call: any) => call && typeof call.name === 'string')
          .map((call: any) => ({
            id: typeof call.id === 'string' ? call.id : undefined,
            name: call.name,
            args: call.args && typeof call.args === 'object' ? call.args : {},
          })),
      });
    }

    const cancellation = message.toolCallCancellation ?? message.tool_call_cancellation;
    if (Array.isArray(cancellation?.ids) && cancellation.ids.length) {
      effects.push({
        type: 'tool-call-cancellation',
        ids: cancellation.ids.filter((id: unknown): id is string => typeof id === 'string'),
      });
    }

    const content = message.serverContent ?? message.server_content;
    if (!content || typeof content !== 'object') return effects;

    if (content.interrupted) {
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `bun test src/features/chat/voice-tool-relay.test.ts src/features/chat/voice-message-handler.test.ts`
Expected: PASS.

- [ ] **Step 6: Add the endpoint**

In `src/api/endpoint.ts`, find:

```ts
  voiceTurns: '/ai/voice/turns',
```

Replace it with:

```ts
  voiceTurns: '/ai/voice/turns',
  voiceMemorySearch: '/ai/voice/memory-search',
```

- [ ] **Step 7: Wire the relay into the hook**

In `src/hooks/use-voice-mode.ts`, find:

```ts
import { buildEphemeralTokenUrl } from '@/features/chat/voice-token-url';
```

Replace it with:

```ts
import { SEARCH_MEMORIES_TOOL, VoiceToolRelay } from '@/features/chat/voice-tool-relay';
import { buildEphemeralTokenUrl } from '@/features/chat/voice-token-url';
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
const TRANSCRIPT_UI_INTERVAL_MS = 100;
```

Replace it with:

```ts
const TRANSCRIPT_UI_INTERVAL_MS = 100;
// Tool calls this build can relay. The API locks matching tools into the session.
const CLIENT_CAPABILITIES = [SEARCH_MEMORIES_TOOL];
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
  const fullDuplexRef = useRef(SPEAKER_FULL_DUPLEX);
```

Replace it with:

```ts
  const toolRelayRef = useRef<VoiceToolRelay | null>(null);
  const fullDuplexRef = useRef(SPEAKER_FULL_DUPLEX);
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
        } else if (effect.type === 'go-away') {
```

Replace it with:

```ts
        } else if (effect.type === 'tool-call') {
          void toolRelayRef.current?.handle(effect.calls);
        } else if (effect.type === 'tool-call-cancellation') {
          toolRelayRef.current?.cancel(effect.ids);
        } else if (effect.type === 'go-away') {
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
    void callNotificationRef.current?.stop();
```

Replace it with:

```ts
    toolRelayRef.current = null;
    void callNotificationRef.current?.stop();
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
                deviceModel: Device.modelName,
              }),
```

Replace it with:

```ts
                deviceModel: Device.modelName,
                capabilities: CLIENT_CAPABILITIES,
              }),
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
          deviceModel: Device.modelName,
        }),
```

Replace it with:

```ts
          deviceModel: Device.modelName,
          capabilities: CLIENT_CAPABILITIES,
        }),
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
      isGreetingActiveRef.current = !fullDuplex;
```

Replace it with:

```ts
      isGreetingActiveRef.current = !fullDuplex;
      toolRelayRef.current = liveToken.tools?.includes(SEARCH_MEMORIES_TOOL)
        ? new VoiceToolRelay(
            async (query) => {
              const response = await post(endpoint.voiceMemorySearch, { query });
              return (response as { data?: { result?: string } })?.data?.result ?? '';
            },
            (functionResponses) => {
              try {
                sessionRef.current?.sendToolResponse({ functionResponses });
              } catch (error) {
                logger.warn('Failed to send voice tool response', error);
              }
            },
          )
        : null;
```

- [ ] **Step 8: Verify**

Run: `bun run typecheck && bun test src/features/chat`
Expected: no type errors, `0 fail`.

- [ ] **Step 9: Commit**

```bash
git add src/features/chat/voice-tool-relay.ts src/features/chat/voice-tool-relay.test.ts src/features/chat/voice-message-handler.ts src/features/chat/voice-message-handler.test.ts src/api/endpoint.ts src/hooks/use-voice-mode.ts
git commit -m "feat(voice): relay memory search tool calls"
```

---

### Task 5: Reconnect immediately on network changes

When the phone switches from Wi-Fi to cellular, the old WebSocket usually dies silently, and TCP can take many seconds to notice. Reconnect with the resume handle as soon as the transport changes or connectivity returns. Also stretch the retry schedule to about 10 seconds, so a short tunnel does not end the call.

**Files:**
- Create: `src/features/chat/voice-network.ts`
- Test: `src/features/chat/voice-network.test.ts`
- Modify: `src/hooks/use-voice-mode.ts`

**Interfaces:**
- Consumes: `reconnectRef` from stopgap Task 6
- Produces: `shouldReconnectOnNetworkChange(previous: NetworkSnapshot | undefined, next: NetworkSnapshot): boolean`, and a `'network-change'` reconnect reason

- [ ] **Step 1: Write the failing test**

Create `src/features/chat/voice-network.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';

import { shouldReconnectOnNetworkChange } from './voice-network';

const wifi = { type: 'wifi', isConnected: true };
const cellular = { type: 'cellular', isConnected: true };
const offline = { type: 'none', isConnected: false };

describe('shouldReconnectOnNetworkChange', () => {
  test('ignores the first snapshot and repeats of the same network', () => {
    expect(shouldReconnectOnNetworkChange(undefined, wifi)).toBe(false);
    expect(shouldReconnectOnNetworkChange(wifi, { ...wifi })).toBe(false);
  });

  test('reconnects when the transport changes', () => {
    expect(shouldReconnectOnNetworkChange(wifi, cellular)).toBe(true);
    expect(shouldReconnectOnNetworkChange(cellular, wifi)).toBe(true);
  });

  test('waits while offline and reconnects when connectivity returns', () => {
    expect(shouldReconnectOnNetworkChange(wifi, offline)).toBe(false);
    expect(shouldReconnectOnNetworkChange(offline, cellular)).toBe(true);
    expect(shouldReconnectOnNetworkChange(wifi, { type: 'wifi', isConnected: null })).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test src/features/chat/voice-network.test.ts`
Expected: FAIL with "Cannot find module './voice-network'".

- [ ] **Step 3: Write the implementation**

Create `src/features/chat/voice-network.ts`:

```ts
export type NetworkSnapshot = {
  type: string;
  isConnected: boolean | null;
};

/**
 * Reconnect the live session when connectivity comes back or the transport
 * changes (for example Wi-Fi to cellular). The old WebSocket usually dies
 * silently on such a switch, and waiting for TCP to notice takes seconds.
 */
export function shouldReconnectOnNetworkChange(
  previous: NetworkSnapshot | undefined,
  next: NetworkSnapshot,
): boolean {
  if (!previous) return false;
  if (next.isConnected !== true) return false;
  if (previous.isConnected !== true) return true;
  return previous.type !== next.type;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test src/features/chat/voice-network.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Wire it into the hook**

In `src/hooks/use-voice-mode.ts`, find:

```ts
import * as Device from 'expo-device';
```

Replace it with:

```ts
import NetInfo from '@react-native-community/netinfo';
import * as Device from 'expo-device';
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
import { createThrottledSetter, type ThrottledSetter } from '@/features/chat/voice-throttle';
```

Replace it with:

```ts
import {
  shouldReconnectOnNetworkChange,
  type NetworkSnapshot,
} from '@/features/chat/voice-network';
import { createThrottledSetter, type ThrottledSetter } from '@/features/chat/voice-throttle';
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
const RECONNECT_DELAYS_MS = [0, 500, 1_500];
```

Replace it with:

```ts
// About 10 s in total, enough to ride out a tunnel or a network switch.
const RECONNECT_DELAYS_MS = [0, 500, 1_500, 3_000, 5_000];

type ReconnectReason = 'go-away' | 'connection-lost' | 'network-change';
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
  const reconnectRef = useRef<(reason: 'go-away' | 'connection-lost') => Promise<boolean>>(
```

Replace it with:

```ts
  const reconnectRef = useRef<(reason: ReconnectReason) => Promise<boolean>>(
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
    async (reason: 'go-away' | 'connection-lost'): Promise<boolean> => {
```

Replace it with:

```ts
    async (reason: ReconnectReason): Promise<boolean> => {
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
  const callNotificationRef = useRef<VoiceCallNotification | null>(null);
```

Replace it with:

```ts
  const networkUnsubscribeRef = useRef<(() => void) | null>(null);
  const lastNetworkRef = useRef<NetworkSnapshot | undefined>(undefined);
  const callNotificationRef = useRef<VoiceCallNotification | null>(null);
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
    toolRelayRef.current = null;
```

Replace it with:

```ts
    networkUnsubscribeRef.current?.();
    networkUnsubscribeRef.current = null;
    lastNetworkRef.current = undefined;
    toolRelayRef.current = null;
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
      if (isMountedRef.current) {
        setIsConnected(true);
        setIsConnecting(false);
      }
```

Replace it with:

```ts
      networkUnsubscribeRef.current?.();
      lastNetworkRef.current = undefined;
      networkUnsubscribeRef.current = NetInfo.addEventListener((state) => {
        const next = { type: String(state.type), isConnected: state.isConnected };
        if (shouldReconnectOnNetworkChange(lastNetworkRef.current, next)) {
          void reconnectRef.current('network-change');
        }
        lastNetworkRef.current = next;
      });
      if (isMountedRef.current) {
        setIsConnected(true);
        setIsConnecting(false);
      }
```

- [ ] **Step 6: Verify the whole app**

Run: `bun run typecheck && bun test && bun run lint`
Expected: no type errors. The test summary shows `0 fail`. Lint shows no errors; warnings that existed before this plan are fine.

- [ ] **Step 7: Commit**

```bash
git add src/features/chat/voice-network.ts src/features/chat/voice-network.test.ts src/hooks/use-voice-mode.ts
git commit -m "feat(voice): reconnect immediately on network changes"
```

---

### Task 6: Device validation

**Files:**
- Modify: `docs/testing/fluid-voice-device-checklist.md`

- [ ] **Step 1: Extend the checklist**

Append:

```markdown
## Phase 1c acceptance (2026-09-30 strategy)

Run on one iPhone and one mid-range Android phone.

- [ ] Lock the screen mid-call for 2 minutes. The conversation continues, and the transcript keeps both sides.
- [ ] Android: the "Memento voice call" notification shows during the call and its stop button ends the call.
- [ ] Switch Wi-Fi off mid-sentence. `[VoiceMode] reconnecting` with reason `network-change` appears, and the call resumes within 3 seconds.
- [ ] Ask about a specific past memory not in the recent chat ("what did I tell you about my grandma's farm?"). The model answers from the memory. The API log shows one `POST /ai/voice/memory-search`.
- [ ] Put a test device's model on `VOICE_SPEAKER_DUPLEX_DENYLIST` on staging. On the next call, speaking over the model on speaker no longer interrupts it.
- [ ] The call screen stays smooth while the model talks. No dropped frames are visible in the transcript animation.
```

- [ ] **Step 2: Run the checklist and commit the results**

```bash
git add docs/testing/fluid-voice-device-checklist.md
git commit -m "docs(voice): phase 1c device checklist"
```
