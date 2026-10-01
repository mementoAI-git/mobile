# Voice Call Actions and App-Wide Calls (Mobile) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The voice model can end the call after a goodbye, mute the microphone, and open any user-facing screen, either ending the call or keeping it going in a floating call bar. Calls survive leaving the call screen.

**Architecture:**
- **Pure logic (unit-tested).** `voice-call-actions.ts` holds the destination catalog and turns tool calls into calls on an injected `CallControls`. `voice-goodbye.ts` decides when it is safe to hang up after `end_call`.
- **Relay.** `VoiceToolRelay` accepts a handler map, so call actions plug in next to `search_memories`.
- **Hook.** `useVoiceMode` gains `setMuted`, `endCallAfterGoodbye`, and speech and turn tracking for the goodbye.
- **App-wide call.** A new `VoiceCallProvider`, mounted once in the root layout, owns the only `useVoiceMode` instance. `FloatingCallBar` shows the call on every other screen. The call screen becomes a view onto the provider's call.

**Tech Stack:** Expo 57, expo-router, React Native 0.86, Bun test.

**Design:** `docs/superpowers/specs/2026-10-01-voice-call-actions-design.md`

## Global Constraints

- **Base:** branch `voice/phase1-phase1c`, with all voice plans merged. Create branch `voice/call-actions` from it.
- **Ship order.** The API plan `api/docs/superpowers/plans/2026-10-01-voice-call-actions-api.md` must be deployed before this app ships. This app sends `capabilities=...,call_actions`. An older API ignores the capability, so the app still works against it, just without the actions.
- **Keep lists in sync.** The keys of `VOICE_DESTINATIONS` must match `VOICE_SCREEN_DESTINATIONS` in the API.
- **How to apply edits.** "In `<file>`, find:" plus a code block, then "Replace it with:" plus a code block. The find text appears exactly once. Copy it exactly, including blank lines and indentation. "Create `<file>`:" writes a new file. If a find text is missing, stop and report. Do not reformat files.
- **Checks:** tests with `bun test <path>`, `bun run typecheck`, `bun run lint`. The pre-commit hook runs `bun run verify`.
- **Verified.** Every edit was generated from, and replayed against, a copy of this branch on 2026-10-01. After the last task: typecheck clean, lint clean, typography check passing, full suite `0 fail`.
- **Commits** end with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Tool relay accepts a handler map

**Files:**
- Modify: `src/features/chat/voice-tool-relay.ts`
- Test: `src/features/chat/voice-tool-relay.test.ts`

**Interfaces:**
- Produces:
  - `type VoiceToolHandler = (args: Record<string, unknown>) => Promise<string> | string`
  - `new VoiceToolRelay(searchMemories, send, handlers?: Record<string, VoiceToolHandler>)`

- [ ] **Step 1: Write the failing test**

In `src/features/chat/voice-tool-relay.test.ts`, find:

```ts
    expect(sent).toEqual([]);
  });
});
```

Replace it with:

```ts
    expect(sent).toEqual([]);
  });

  test('routes other tools to their handlers and survives handler failures', async () => {
    const sent: VoiceToolResponse[][] = [];
    const instance = new VoiceToolRelay(
      async () => 'unused',
      (responses) => sent.push(responses),
      {
        end_call: () => 'Ending.',
        broken: () => {
          throw new Error('boom');
        },
      },
    );

    await instance.handle([
      { id: 'a', name: 'end_call', args: {} },
      { id: 'b', name: 'broken', args: {} },
      { id: 'c', name: 'constructor', args: {} },
    ]);

    expect(sent[0].map((response) => response.response.result)).toEqual([
      'Ending.',
      'broken failed. Tell the host it did not work.',
      'Unknown tool constructor.',
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test src/features/chat/voice-tool-relay.test.ts`
Expected: the new test FAILS. `end_call` is answered with "Unknown tool end_call.".

- [ ] **Step 3: Route calls to handlers**

In `src/features/chat/voice-tool-relay.ts`, find:

```ts
};

export type VoiceToolResponse = {
  id?: string;
```

Replace it with:

```ts
};

/** Handles one tool call and returns the text the model receives. */
export type VoiceToolHandler = (args: Record<string, unknown>) => Promise<string> | string;

export type VoiceToolResponse = {
  id?: string;
```

In `src/features/chat/voice-tool-relay.ts`, find:

```ts
    private readonly searchMemories: (query: string) => Promise<string>,
    private readonly send: (responses: VoiceToolResponse[]) => void,
  ) {}
```

Replace it with:

```ts
    private readonly searchMemories: (query: string) => Promise<string>,
    private readonly send: (responses: VoiceToolResponse[]) => void,
    private readonly handlers: Record<string, VoiceToolHandler> = {},
  ) {}
```

In `src/features/chat/voice-tool-relay.ts`, find:

```ts
      response: { result },
    });
    if (call.name !== SEARCH_MEMORIES_TOOL) return reply(`Unknown tool ${call.name}.`);
    const query = typeof call.args?.query === 'string' ? call.args.query.trim() : '';
```

Replace it with:

```ts
      response: { result },
    });
    if (Object.prototype.hasOwnProperty.call(this.handlers, call.name)) {
      try {
        return reply(await this.handlers[call.name](call.args ?? {}));
      } catch {
        return reply(`${call.name} failed. Tell the host it did not work.`);
      }
    }
    if (call.name !== SEARCH_MEMORIES_TOOL) return reply(`Unknown tool ${call.name}.`);
    const query = typeof call.args?.query === 'string' ? call.args.query.trim() : '';
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test src/features/chat/voice-tool-relay.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/chat/voice-tool-relay.ts src/features/chat/voice-tool-relay.test.ts
git commit -m "refactor(voice): let the tool relay route calls to handlers" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Call action handlers and goodbye timing

**Files:**
- Create: `src/features/chat/voice-call-actions.ts`, `src/features/chat/voice-goodbye.ts`
- Test: `src/features/chat/voice-call-actions.test.ts`, `src/features/chat/voice-goodbye.test.ts`

**Interfaces:**
- Consumes: `VoiceToolHandler` from Task 1
- Produces:
  - `CALL_ACTION_TOOLS`, `CALL_ACTIONS_CAPABILITY = 'call_actions'`, `VOICE_DESTINATIONS` and `resolveVoiceDestination(value)`
  - `interface CallControls { endAfterGoodbye(then?); setMuted(muted); navigate(href) }`
  - `createCallActionHandlers(controls): Record<string, VoiceToolHandler>`
  - `GoodbyeTracker` with `onModelAudio()`, `onTurnComplete()` and `shouldHangUp(now, isPlaying)`, plus `GOODBYE_QUIET_MS = 1500` and `GOODBYE_MAX_MS = 6000`

- [ ] **Step 1: Write the failing tests**

Create `src/features/chat/voice-call-actions.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';

import {
  CALL_ACTION_TOOLS,
  createCallActionHandlers,
  resolveVoiceDestination,
  VOICE_DESTINATIONS,
  type CallControls,
} from './voice-call-actions';

function fakeControls() {
  const calls: string[] = [];
  let pendingThen: (() => void) | undefined;
  const controls: CallControls = {
    endAfterGoodbye: (then) => {
      calls.push('endAfterGoodbye');
      pendingThen = then;
    },
    setMuted: (muted) => calls.push(`setMuted:${muted}`),
    navigate: (href) => calls.push(`navigate:${href}`),
  };
  return { controls, calls, finishGoodbye: () => pendingThen?.() };
}

describe('voice call actions', () => {
  test('covers the three call tools', () => {
    const { controls } = fakeControls();
    expect(Object.keys(createCallActionHandlers(controls))).toEqual(CALL_ACTION_TOOLS);
  });

  test('end_call hangs up after the goodbye', async () => {
    const { controls, calls } = fakeControls();
    const result = await createCallActionHandlers(controls).end_call({});

    expect(calls).toEqual(['endAfterGoodbye']);
    expect(result).toMatch(/goodbye/);
  });

  test('set_microphone only mutes', async () => {
    const { controls, calls } = fakeControls();
    const handlers = createCallActionHandlers(controls);

    expect(await handlers.set_microphone({ muted: true })).toMatch(/tap to unmute/);
    expect(await handlers.set_microphone({ muted: false })).toMatch(/cannot unmute/);
    expect(calls).toEqual(['setMuted:true']);
  });

  test('open_screen with keep_talking navigates now', async () => {
    const { controls, calls } = fakeControls();

    await createCallActionHandlers(controls).open_screen({
      destination: 'time_capsules',
      keep_talking: true,
    });

    expect(calls).toEqual(['navigate:/(tabs)/capsule']);
  });

  test('open_screen without keep_talking navigates after the goodbye', async () => {
    const { controls, calls, finishGoodbye } = fakeControls();

    await createCallActionHandlers(controls).open_screen({
      destination: 'settings',
      keep_talking: false,
    });
    expect(calls).toEqual(['endAfterGoodbye']);

    finishGoodbye();
    expect(calls).toEqual(['endAfterGoodbye', 'navigate:/settings']);
  });

  test('unknown or inherited destinations do nothing', async () => {
    const { controls, calls } = fakeControls();
    const handlers = createCallActionHandlers(controls);

    expect(await handlers.open_screen({ destination: 'admin_panel', keep_talking: true })).toMatch(
      /isn't available/,
    );
    expect(resolveVoiceDestination('toString')).toBeUndefined();
    expect(resolveVoiceDestination(42)).toBeUndefined();
    expect(calls).toEqual([]);
  });

  test('every destination is an app route', () => {
    for (const { href } of Object.values(VOICE_DESTINATIONS)) {
      expect(href.startsWith('/')).toBe(true);
    }
    expect(Object.keys(VOICE_DESTINATIONS)).toHaveLength(18);
  });
});
```

Create `src/features/chat/voice-goodbye.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';

import { GOODBYE_MAX_MS, GOODBYE_QUIET_MS, GoodbyeTracker } from './voice-goodbye';

describe('GoodbyeTracker', () => {
  test('goodbye spoken before the tool call: waits for playback, then the quiet period', () => {
    const tracker = new GoodbyeTracker(0);

    expect(tracker.shouldHangUp(500, true)).toBe(false);
    expect(tracker.shouldHangUp(1_000, false)).toBe(false);
    expect(tracker.shouldHangUp(GOODBYE_QUIET_MS, false)).toBe(true);
  });

  test('goodbye spoken after the tool response: waits for that turn to finish playing', () => {
    const tracker = new GoodbyeTracker(0);

    tracker.onModelAudio();
    expect(tracker.shouldHangUp(2_000, false)).toBe(false);

    tracker.onTurnComplete();
    expect(tracker.shouldHangUp(2_100, true)).toBe(false);
    expect(tracker.shouldHangUp(2_600, false)).toBe(true);
  });

  test('more speech after a completed turn waits again', () => {
    const tracker = new GoodbyeTracker(0);

    tracker.onModelAudio();
    tracker.onTurnComplete();
    tracker.onModelAudio();

    expect(tracker.shouldHangUp(3_000, false)).toBe(false);
  });

  test('always hangs up by the cap', () => {
    const tracker = new GoodbyeTracker(0);
    tracker.onModelAudio();

    expect(tracker.shouldHangUp(GOODBYE_MAX_MS, true)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test src/features/chat/voice-call-actions.test.ts src/features/chat/voice-goodbye.test.ts`
Expected: both FAIL with "Cannot find module".

- [ ] **Step 3: Write the implementations**

Create `src/features/chat/voice-call-actions.ts`:

```ts
import type { VoiceToolHandler } from './voice-tool-relay';

export const END_CALL_TOOL = 'end_call';
export const SET_MICROPHONE_TOOL = 'set_microphone';
export const OPEN_SCREEN_TOOL = 'open_screen';
export const CALL_ACTION_TOOLS = [END_CALL_TOOL, SET_MICROPHONE_TOOL, OPEN_SCREEN_TOOL];

/** Token capability that asks the API to lock the call action tools into the session. */
export const CALL_ACTIONS_CAPABILITY = 'call_actions';

/**
 * Screens the model may open. Keep the keys in sync with
 * VOICE_SCREEN_DESTINATIONS in api/src/module/api/ai/live-session-config.ts.
 */
export const VOICE_DESTINATIONS = {
  home: { href: '/(tabs)/overview', label: 'home' },
  chat: { href: '/(tabs)/chat', label: 'chat' },
  stories: { href: '/(tabs)/stories', label: 'your stories' },
  new_story: { href: '/editor?mode=story&lockMode=true', label: 'a new story' },
  quick_note: { href: '/editor?mode=quick-capture', label: 'a quick note' },
  time_capsules: { href: '/(tabs)/capsule', label: 'your time capsules' },
  explore_prompts: { href: '/(tabs)/explore', label: 'explore prompts' },
  insights: { href: '/insights', label: 'insights' },
  account: { href: '/account', label: 'your account' },
  settings: { href: '/settings', label: 'settings' },
  profile: { href: '/settings/profile', label: 'your profile' },
  plan_and_billing: { href: '/settings/billing', label: 'plan and billing' },
  upgrade: { href: '/pricing', label: 'plans' },
  privacy: { href: '/settings/privacy', label: 'privacy settings' },
  beneficiaries: { href: '/settings/beneficiaries', label: 'beneficiaries' },
  feedback: { href: '/settings/feedback', label: 'feedback' },
  activity: { href: '/settings/activities', label: 'your activity' },
  two_factor: { href: '/settings/two-factor', label: 'two-factor settings' },
} as const;

export type VoiceDestination = keyof typeof VOICE_DESTINATIONS;

export function resolveVoiceDestination(
  value: unknown,
): (typeof VOICE_DESTINATIONS)[VoiceDestination] | undefined {
  if (typeof value !== 'string') return undefined;
  if (!Object.prototype.hasOwnProperty.call(VOICE_DESTINATIONS, value)) return undefined;
  return VOICE_DESTINATIONS[value as VoiceDestination];
}

/** What the call actions need from the app. */
export interface CallControls {
  /** Hang up once the model's goodbye has played, then run `then`. */
  endAfterGoodbye(then?: () => void): void;
  setMuted(muted: boolean): void;
  /** Open a screen while the call keeps going. */
  navigate(href: string): void;
}

export function createCallActionHandlers(
  controls: CallControls,
): Record<string, VoiceToolHandler> {
  return {
    [END_CALL_TOOL]: () => {
      controls.endAfterGoodbye();
      return 'Ending the call after your goodbye.';
    },
    [SET_MICROPHONE_TOOL]: (args) => {
      if (args.muted === false) {
        return 'You cannot unmute the host. They tap the screen to unmute.';
      }
      controls.setMuted(true);
      return 'Microphone muted. The host will tap to unmute.';
    },
    [OPEN_SCREEN_TOOL]: (args) => {
      const target = resolveVoiceDestination(args.destination);
      if (!target) return "That screen isn't available. Tell the host you can't open it.";
      if (args.keep_talking === true) {
        controls.navigate(target.href);
        return `Opened ${target.label}. The call continues.`;
      }
      controls.endAfterGoodbye(() => controls.navigate(target.href));
      return `Opening ${target.label} after your goodbye.`;
    },
  };
}
```

Create `src/features/chat/voice-goodbye.ts`:

```ts
/** Hang up this long after end_call if the model says nothing more. */
export const GOODBYE_QUIET_MS = 1_500;
/** Always hang up by this point, even if Gemini never finishes its turn. */
export const GOODBYE_MAX_MS = 6_000;

/**
 * Decides when it is safe to hang up after the model calls end_call.
 * Gemini may speak the goodbye before the tool call (it is then still
 * playing) or after the tool response (a new turn follows).
 */
export class GoodbyeTracker {
  private sawSpeechAfterResponse = false;
  private turnCompletedAfterSpeech = false;

  constructor(private readonly startedAt: number) {}

  onModelAudio(): void {
    this.sawSpeechAfterResponse = true;
    this.turnCompletedAfterSpeech = false;
  }

  onTurnComplete(): void {
    if (this.sawSpeechAfterResponse) this.turnCompletedAfterSpeech = true;
  }

  shouldHangUp(now: number, isPlaying: boolean): boolean {
    const elapsed = now - this.startedAt;
    if (elapsed >= GOODBYE_MAX_MS) return true;
    if (isPlaying) return false;
    if (this.sawSpeechAfterResponse) return this.turnCompletedAfterSpeech;
    return elapsed >= GOODBYE_QUIET_MS;
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun test src/features/chat/voice-call-actions.test.ts src/features/chat/voice-goodbye.test.ts && bun run typecheck`
Expected: PASS, 11 tests, and no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/chat/voice-call-actions.ts src/features/chat/voice-call-actions.test.ts src/features/chat/voice-goodbye.ts src/features/chat/voice-goodbye.test.ts
git commit -m "feat(voice): call action handlers and goodbye timing" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Wire call actions into the voice hook

After `end_call`, the hook polls every 100 ms and hangs up when `GoodbyeTracker` says the goodbye has played, at most 6 s later. Speech and turn-complete events feed the tracker.

This task also fixes a latent bug that the app-wide call would expose. `connect` used a stale `memoryId`, and a previous call's conversation could leak into the next call. Each call now starts from the current `memoryId` prop.

**Files:**
- Modify: `src/hooks/use-voice-mode.ts`

**Interfaces:**
- Consumes: Tasks 1 and 2
- Produces:
  - `type VoiceCallActionEffects = { navigate(href: string): void; onModelEndedCall(): void }`
  - `useVoiceMode({ memoryId, voiceName, callActions? })`
  - The return value gains `setMuted(muted: boolean)` and `endCallAfterGoodbye(then?: () => void)`
  - The token request sends `capabilities=search_memories,call_actions`

- [ ] **Step 1: Apply the edits**

In `src/hooks/use-voice-mode.ts`, find:

```ts
import { SEARCH_MEMORIES_TOOL, VoiceToolRelay } from '@/features/chat/voice-tool-relay';
import { buildEphemeralTokenUrl } from '@/features/chat/voice-token-url';
import { formatVoiceCallDuration } from '@/features/chat/voice-call-flow';
import { serializeVoiceCallTranscript } from '@/features/chat/voice-transcript-parser';
```

Replace it with:

```ts
import { SEARCH_MEMORIES_TOOL, VoiceToolRelay } from '@/features/chat/voice-tool-relay';
import { buildEphemeralTokenUrl } from '@/features/chat/voice-token-url';
import {
  CALL_ACTION_TOOLS,
  CALL_ACTIONS_CAPABILITY,
  createCallActionHandlers,
} from '@/features/chat/voice-call-actions';
import { GoodbyeTracker } from '@/features/chat/voice-goodbye';
import { formatVoiceCallDuration } from '@/features/chat/voice-call-flow';
import { serializeVoiceCallTranscript } from '@/features/chat/voice-transcript-parser';
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
const TRANSCRIPT_UI_INTERVAL_MS = 100;
// Tool calls this build can relay. The API locks matching tools into the session.
const CLIENT_CAPABILITIES = [SEARCH_MEMORIES_TOOL];
const SPEAKER_FULL_DUPLEX = process.env.EXPO_PUBLIC_VOICE_FULL_DUPLEX === 'true';
// About 10 s in total, enough to ride out a tunnel or a network switch.
```

Replace it with:

```ts
const TRANSCRIPT_UI_INTERVAL_MS = 100;
// Tool calls this build can relay. The API locks matching tools into the session.
const CLIENT_CAPABILITIES = [SEARCH_MEMORIES_TOOL, CALL_ACTIONS_CAPABILITY];
const SPEAKER_FULL_DUPLEX = process.env.EXPO_PUBLIC_VOICE_FULL_DUPLEX === 'true';
// About 10 s in total, enough to ride out a tunnel or a network switch.
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
}

export function useVoiceMode({
  memoryId,
  voiceName,
}: { memoryId?: string | null; voiceName?: string } = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
```

Replace it with:

```ts
}

/** App-level effects of call actions, supplied by the call provider. */
export type VoiceCallActionEffects = {
  /** Open a screen while the call keeps going. */
  navigate(href: string): void;
  /** The model ended the call; leave the call screen if it is open. */
  onModelEndedCall(): void;
};

export function useVoiceMode({
  memoryId,
  voiceName,
  callActions,
}: {
  memoryId?: string | null;
  voiceName?: string;
  callActions?: VoiceCallActionEffects;
} = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
  const turnSyncRef = useRef<VoiceTurnSync | null>(null);
  const toolRelayRef = useRef<VoiceToolRelay | null>(null);
  const fullDuplexRef = useRef(SPEAKER_FULL_DUPLEX);
  const networkUnsubscribeRef = useRef<(() => void) | null>(null);
```

Replace it with:

```ts
  const turnSyncRef = useRef<VoiceTurnSync | null>(null);
  const toolRelayRef = useRef<VoiceToolRelay | null>(null);
  const callActionsRef = useRef(callActions);
  callActionsRef.current = callActions;
  const goodbyeRef = useRef<{
    tracker: GoodbyeTracker;
    timer: ReturnType<typeof setInterval>;
    then?: () => void;
  } | null>(null);
  const fullDuplexRef = useRef(SPEAKER_FULL_DUPLEX);
  const networkUnsubscribeRef = useRef<(() => void) | null>(null);
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
          if (isMountedRef.current) setIsAiSpeaking(false);
        } else if (effect.type === 'output-audio') {
          if (engine?.enqueueOutput(effect.data, effect.epoch) && isMountedRef.current) {
            isAiSpeakingRef.current = true;
```

Replace it with:

```ts
          if (isMountedRef.current) setIsAiSpeaking(false);
        } else if (effect.type === 'output-audio') {
          goodbyeRef.current?.tracker.onModelAudio();
          if (engine?.enqueueOutput(effect.data, effect.epoch) && isMountedRef.current) {
            isAiSpeakingRef.current = true;
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
        } else if (effect.type === 'turn-complete') {
          engine?.finishOutputTurn();
          // Transcription is explicitly independent of modelTurn ordering in
          // Gemini Live. Give a final transcription frame a bounded grace
```

Replace it with:

```ts
        } else if (effect.type === 'turn-complete') {
          engine?.finishOutputTurn();
          goodbyeRef.current?.tracker.onTurnComplete();
          // Transcription is explicitly independent of modelTurn ordering in
          // Gemini Live. Give a final transcription frame a bounded grace
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
    lastNetworkRef.current = undefined;
    toolRelayRef.current = null;
    void callNotificationRef.current?.stop();
    if (greetingTimerRef.current) {
```

Replace it with:

```ts
    lastNetworkRef.current = undefined;
    toolRelayRef.current = null;
    if (goodbyeRef.current) {
      clearInterval(goodbyeRef.current.timer);
      goodbyeRef.current = null;
    }
    void callNotificationRef.current?.stop();
    if (greetingTimerRef.current) {
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
  connectionLostRef.current = handleConnectionLost;

  const connect = useCallback(async () => {
    if (isConnecting || isConnected || isDisconnectingRef.current) return;
```

Replace it with:

```ts
  connectionLostRef.current = handleConnectionLost;

  const setMuted = useCallback((muted: boolean) => {
    isMutedRef.current = muted;
    setIsMuted(muted);
  }, []);

  /** Hang up once the model's goodbye has played (at most 6 s), then run `then`. */
  const endCallAfterGoodbye = useCallback((then?: () => void) => {
    if (goodbyeRef.current || !isSessionActiveRef.current) return;
    const timer = setInterval(() => {
      const pending = goodbyeRef.current;
      if (!pending) return;
      const playing = engineRef.current?.isAudible(150) ?? false;
      if (!pending.tracker.shouldHangUp(Date.now(), playing)) return;
      clearInterval(pending.timer);
      goodbyeRef.current = null;
      void disconnectRef.current().then(() => {
        if (pending.then) pending.then();
        else callActionsRef.current?.onModelEndedCall();
      });
    }, 100);
    goodbyeRef.current = { tracker: new GoodbyeTracker(Date.now()), timer, then };
  }, []);

  const connect = useCallback(async () => {
    if (isConnecting || isConnected || isDisconnectingRef.current) return;
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
    isAiSpeakingRef.current = false;
    resumeHandleRef.current = null;
    setIsMuted(false);
    setRecordingTime(0);
```

Replace it with:

```ts
    isAiSpeakingRef.current = false;
    resumeHandleRef.current = null;
    // The call outlives the call screen, so start each call from the current
    // prop rather than the conversation a previous call used.
    memoryIdRef.current =
      memoryId && /^[0-9a-fA-F]{24}$/.test(memoryId) ? memoryId : undefined;
    setIsMuted(false);
    setRecordingTime(0);
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
      engine.setSpeakerFullDuplex(fullDuplex);
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
      turnSyncRef.current = liveToken.supportsVoiceTurns
        ? new VoiceTurnSync(
```

Replace it with:

```ts
      engine.setSpeakerFullDuplex(fullDuplex);
      isGreetingActiveRef.current = !fullDuplex;
      const sessionTools = liveToken.tools ?? [];
      const callActionsEnabled = CALL_ACTION_TOOLS.some((tool) => sessionTools.includes(tool));
      toolRelayRef.current =
        sessionTools.includes(SEARCH_MEMORIES_TOOL) || callActionsEnabled
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
              callActionsEnabled
                ? createCallActionHandlers({
                    endAfterGoodbye: endCallAfterGoodbye,
                    setMuted,
                    navigate: (href) => callActionsRef.current?.navigate(href),
                  })
                : {},
            )
          : null;
      turnSyncRef.current = liveToken.supportsVoiceTurns
        ? new VoiceTurnSync(
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
  }, [
    disconnect,
    handleLiveMessage,
    isConnected,
    isConnecting,
    openLiveSession,
    resolveTargetMemoryId,
    voiceName,
  ]);
```

Replace it with:

```ts
  }, [
    disconnect,
    endCallAfterGoodbye,
    isConnected,
    isConnecting,
    memoryId,
    openLiveSession,
    resolveTargetMemoryId,
    setMuted,
    voiceName,
  ]);
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
      disconnect,
      toggleMute,
      interrupt,
    }),
```

Replace it with:

```ts
      disconnect,
      toggleMute,
      setMuted,
      endCallAfterGoodbye,
      interrupt,
    }),
```

In `src/hooks/use-voice-mode.ts`, find:

```ts
      disconnect,
      toggleMute,
      interrupt,
    ],
```

Replace it with:

```ts
      disconnect,
      toggleMute,
      setMuted,
      endCallAfterGoodbye,
      interrupt,
    ],
```

- [ ] **Step 2: Verify**

Run: `bun run typecheck && bun test src/features/chat && npx eslint src/hooks/use-voice-mode.ts`
Expected: no type errors, `0 fail`, and 0 eslint errors. One existing `array-type` warning is fine.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-voice-mode.ts
git commit -m "feat(voice): execute call actions from the live session" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: App-wide call provider and floating call bar

**Files:**
- Create: `src/hooks/use-voice-call.tsx`, `src/components/chat/FloatingCallBar.tsx`
- Modify: `app/_layout.tsx`
- Test: `src/features/chat/voice-call-provider-contract.test.ts`

**Interfaces:**
- Consumes: `useVoiceMode` and `VoiceCallActionEffects` from Task 3
- Produces:
  - `VoiceCallProvider`
  - `useVoiceCall(): { voice, configure({ memoryId?, voiceName? }) }`
  - `VOICE_CALL_PATH = '/voice-call'`
  - `FloatingCallBar`

- [ ] **Step 1: Write the failing test**

Create `src/features/chat/voice-call-provider-contract.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';

const read = (path: string) => Bun.file(new URL(`../../../${path}`, import.meta.url)).text();

describe('app-wide voice call', () => {
  test('the root layout owns the call and shows the floating bar', async () => {
    const layout = await read('app/_layout.tsx');

    expect(layout).toContain('<VoiceCallProvider>');
    expect(layout).toContain('<FloatingCallBar />');
    expect(layout.indexOf('<BackgroundMusicProvider>')).toBeLessThan(
      layout.indexOf('<VoiceCallProvider>'),
    );
  });

  test('the provider pauses music, ends the call on sign-out, and leaves the call screen for actions', async () => {
    const provider = await read('src/hooks/use-voice-call.tsx');

    expect(provider).toContain('pauseForVoice()');
    expect(provider).toContain('resumeAfterVoice()');
    expect(provider).toContain('state.token');
    expect(provider).toContain('pathnameRef.current === VOICE_CALL_PATH');
    expect(provider).toContain('onModelEndedCall: leaveCallScreen');
  });

  test('the floating bar hides on the call screen and can end the call', async () => {
    const bar = await read('src/components/chat/FloatingCallBar.tsx');

    expect(bar).toContain('pathname === VOICE_CALL_PATH');
    expect(bar).toContain('accessibilityLabel="End call"');
    expect(bar).toContain('voice.disconnect()');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test src/features/chat/voice-call-provider-contract.test.ts`
Expected: FAIL. The layout has no `<VoiceCallProvider>`, and the provider file does not exist.

- [ ] **Step 3: Write the provider and the bar**

Create `src/hooks/use-voice-call.tsx`:

```tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { router, usePathname } from 'expo-router';

import { useBackgroundMusic } from '@/hooks/use-background-music';
import { useVoiceMode, type VoiceCallActionEffects } from '@/hooks/use-voice-mode';
import { useAuthStore } from '@/store';

export const VOICE_CALL_PATH = '/voice-call';

export type VoiceCallConfig = {
  memoryId?: string | null;
  voiceName?: string;
};

type VoiceCallContextValue = {
  voice: ReturnType<typeof useVoiceMode>;
  /** Set which conversation and voice the next call uses. Ignored during a call. */
  configure(config: VoiceCallConfig): void;
};

const VoiceCallContext = createContext<VoiceCallContextValue | null>(null);

/**
 * Owns the single voice call for the whole app, so a call survives leaving
 * the call screen. The call screen and the floating call bar are views onto it.
 */
export function VoiceCallProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<VoiceCallConfig>({});
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const leaveCallScreen = useCallback(() => {
    if (pathnameRef.current === VOICE_CALL_PATH && router.canGoBack()) router.back();
  }, []);

  const callActions = useMemo<VoiceCallActionEffects>(
    () => ({
      navigate: (href) => {
        leaveCallScreen();
        router.push(href as never);
      },
      onModelEndedCall: leaveCallScreen,
    }),
    [leaveCallScreen],
  );

  const voice = useVoiceMode({
    memoryId: config.memoryId,
    voiceName: config.voiceName,
    callActions,
  });
  const active = voice.isConnected || voice.isConnecting;
  const activeRef = useRef(active);
  activeRef.current = active;

  const configure = useCallback((next: VoiceCallConfig) => {
    if (activeRef.current) return;
    setConfig((current) =>
      current.memoryId === next.memoryId && current.voiceName === next.voiceName ? current : next,
    );
  }, []);

  const { pauseForVoice, resumeAfterVoice } = useBackgroundMusic();
  useEffect(() => {
    if (active) pauseForVoice();
    else resumeAfterVoice();
  }, [active, pauseForVoice, resumeAfterVoice]);

  const token = useAuthStore((state) => state.token);
  const { disconnect } = voice;
  useEffect(() => {
    if (!token && active) void disconnect();
  }, [active, disconnect, token]);

  const value = useMemo(() => ({ voice, configure }), [voice, configure]);
  return <VoiceCallContext.Provider value={value}>{children}</VoiceCallContext.Provider>;
}

export function useVoiceCall(): VoiceCallContextValue {
  const context = useContext(VoiceCallContext);
  if (!context) throw new Error('useVoiceCall must be used inside VoiceCallProvider');
  return context;
}
```

Create `src/components/chat/FloatingCallBar.tsx`:

```tsx
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MicOff, PhoneOff } from 'lucide-react-native';

import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { formatVoiceCallDuration } from '@/features/chat/voice-call-flow';
import { useVoiceCall, VOICE_CALL_PATH } from '@/hooks/use-voice-call';

/** Shown on every screen except the call screen while a call is live. */
export function FloatingCallBar() {
  const { voice } = useVoiceCall();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  if (!voice.isConnected || pathname === VOICE_CALL_PATH) return null;

  const status = voice.isMuted
    ? 'Muted, tap to talk'
    : voice.isAiSpeaking
      ? 'Memento is speaking'
      : 'Listening';

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16 }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Return to voice call"
        onPress={() => router.push(VOICE_CALL_PATH as never)}
        className="min-h-11 flex-row items-center rounded-full pl-4"
        style={{ backgroundColor: COLORS.backgroundInverse }}
      >
        <View
          className="size-2 rounded-full"
          style={{
            backgroundColor: voice.isMuted
              ? COLORS.error
              : voice.isAiSpeaking
                ? COLORS.brand
                : COLORS.success,
          }}
        />
        <Text
          numberOfLines={1}
          className="ml-3 flex-1"
          style={{ ...TYPE.label, color: COLORS.textInverse }}
        >
          {`${formatVoiceCallDuration(voice.recordingTime)} · ${status}`}
        </Text>
        {voice.isMuted ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Unmute"
            onPress={voice.toggleMute}
            className="min-h-11 min-w-11 items-center justify-center"
          >
            <MicOff size={20} color={COLORS.textInverse} />
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="End call"
          onPress={() => void voice.disconnect()}
          className="min-h-11 min-w-11 items-center justify-center"
        >
          <PhoneOff size={20} color={COLORS.error} />
        </Pressable>
      </Pressable>
    </View>
  );
}
```

- [ ] **Step 4: Mount them in the root layout**

`VoiceCallProvider` goes inside `BackgroundMusicProvider`, because it pauses the music, and around everything else. `FloatingCallBar` goes after the `Stack`, so it draws above every screen.

In `app/_layout.tsx`, find:

```tsx
import { VaultLockoutScreen } from '@/components/security/VaultLockoutScreen';
import { BackgroundMusicProvider } from '@/hooks/use-background-music';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageKeys } from '@/constants/storage-keys';
```

Replace it with:

```tsx
import { VaultLockoutScreen } from '@/components/security/VaultLockoutScreen';
import { BackgroundMusicProvider } from '@/hooks/use-background-music';
import { VoiceCallProvider } from '@/hooks/use-voice-call';
import { FloatingCallBar } from '@/components/chat/FloatingCallBar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageKeys } from '@/constants/storage-keys';
```

In `app/_layout.tsx`, find:

```tsx
                  <ToastProvider>
                    <BackgroundMusicProvider>
                      <OfflineNotice />
```

Replace it with:

```tsx
                  <ToastProvider>
                    <BackgroundMusicProvider>
                    <VoiceCallProvider>
                      <OfflineNotice />
```

In `app/_layout.tsx`, find:

```tsx
                      </Stack>

                      <SheetManager />
                      <AppSwitcherPrivacyBlur />
                      <VaultLockoutScreen />
                    </BackgroundMusicProvider>
                  </ToastProvider>
```

Replace it with:

```tsx
                      </Stack>

                      <FloatingCallBar />

                      <SheetManager />
                      <AppSwitcherPrivacyBlur />
                      <VaultLockoutScreen />
                    </VoiceCallProvider>
                    </BackgroundMusicProvider>
                  </ToastProvider>
```

- [ ] **Step 5: Verify**

Run: `bun test src/features/chat/voice-call-provider-contract.test.ts && bun run typecheck`
Expected: PASS, 3 tests, and no type errors. The call screen still uses its own `useVoiceMode` until Task 5. That is fine: it only means two hook instances exist for one task.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/use-voice-call.tsx src/components/chat/FloatingCallBar.tsx app/_layout.tsx src/features/chat/voice-call-provider-contract.test.ts
git commit -m "feat(voice): app-wide call provider and floating call bar" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The call screen shows the provider's call

**Files:**
- Modify: `app/voice-call.tsx`
- Test: `src/features/chat/voice-call-provider-contract.test.ts`, `src/features/chat/voice-call-route.test.ts`

**Interfaces:**
- Consumes: `useVoiceCall` from Task 4

- [ ] **Step 1: Write the failing tests**

Append inside the `describe` of `src/features/chat/voice-call-provider-contract.test.ts`:

```ts
  test('the call screen is a view onto the provider call', async () => {
    const screen = await read('app/voice-call.tsx');

    expect(screen).toContain('useVoiceCall()');
    expect(screen).not.toContain('useVoiceMode(');
    expect(screen).not.toContain('useBackgroundMusic');
    expect(screen).toContain('accessibilityLabel="Minimize call"');
    expect(screen).toContain("return voice.isMuted ? 'muted' : 'live';");
  });
```

In `src/features/chat/voice-call-route.test.ts`, find:

```ts
    expect(route).toContain('providerVoiceName');
    expect(route).toContain("getVoiceCallTransition(stage, 'connection-failed')");
    expect(route).toContain('pauseForVoice');
  });
});
```

Replace it with:

```ts
    expect(route).toContain('providerVoiceName');
    expect(route).toContain("getVoiceCallTransition(stage, 'connection-failed')");
    expect(route).toContain('useVoiceCall()');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test src/features/chat/voice-call-provider-contract.test.ts src/features/chat/voice-call-route.test.ts`
Expected: FAIL. The screen does not use `useVoiceCall()` yet.

- [ ] **Step 3: Refactor the screen**

These edits make the screen use the shared call and remove its own music handling, which is now the provider's job. The screen follows the call's real state, so it shows the live call when reopened and reflects model-initiated mute. Its minimize button leaves the call running in the floating bar.

In `app/voice-call.tsx`, find:

```tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mic, MicOff, PhoneOff, Settings, Square } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { NativeModalSafeAreaBoundary } from '@/components/system/NativeModalSafeAreaBoundary';
```

Replace it with:

```tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown, Mic, MicOff, PhoneOff, Settings, Square } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { NativeModalSafeAreaBoundary } from '@/components/system/NativeModalSafeAreaBoundary';
```

In `app/voice-call.tsx`, find:

```tsx
import { VOICE_CATALOG, getVoiceById, type VoiceId } from '@/features/chat/voice-catalog';
import { formatVoiceCallDuration, getVoiceCallTransition, type VoiceCallStage } from '@/features/chat/voice-call-flow';
import { useVoiceMode } from '@/hooks/use-voice-mode';
import { useBackgroundMusic } from '@/hooks/use-background-music';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/constants/query-keys';
```

Replace it with:

```tsx
import { VOICE_CATALOG, getVoiceById, type VoiceId } from '@/features/chat/voice-catalog';
import { formatVoiceCallDuration, getVoiceCallTransition, type VoiceCallStage } from '@/features/chat/voice-call-flow';
import { useVoiceCall } from '@/hooks/use-voice-call';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/constants/query-keys';
```

In `app/voice-call.tsx`, find:

```tsx
    [draftVoiceId, selectedVoiceId],
  );
  const voice = useVoiceMode({ memoryId: effectiveMemoryId, voiceName: selectedVoice.providerVoiceName });
  const { pauseForVoice, resumeAfterVoice } = useBackgroundMusic();

  useEffect(() => {
```

Replace it with:

```tsx
    [draftVoiceId, selectedVoiceId],
  );
  const { voice, configure } = useVoiceCall();

  useEffect(() => {
    configure({ memoryId: effectiveMemoryId, voiceName: selectedVoice.providerVoiceName });
  }, [configure, effectiveMemoryId, selectedVoice.providerVoiceName]);

  useEffect(() => {
```

In `app/voice-call.tsx`, find:

```tsx
  }, [stage, voice.connectionFailure]);

  useEffect(() => {
    if (stage === 'live' || stage === 'muted' || stage === 'connecting') {
      pauseForVoice();
      return;
    }
    resumeAfterVoice();
  }, [pauseForVoice, resumeAfterVoice, stage]);

  const close = useCallback(async (options?: { showDebrief?: boolean }) => {
    resumeAfterVoice();
    const duration = voice.recordingTime;
    const userSpeechText = voice.userSpeechText;
```

Replace it with:

```tsx
  }, [stage, voice.connectionFailure]);

  // The call lives in VoiceCallProvider. When this screen opens during a call,
  // or the model mutes the microphone, follow the call's real state.
  useEffect(() => {
    if (!voice.isConnected) return;
    setStage((current) => {
      if (current === 'ending') return current;
      return voice.isMuted ? 'muted' : 'live';
    });
  }, [voice.isConnected, voice.isMuted]);

  const close = useCallback(async (options?: { showDebrief?: boolean }) => {
    const duration = voice.recordingTime;
    const userSpeechText = voice.userSpeechText;
```

In `app/voice-call.tsx`, find:

```tsx
      }, 350);
    }
  }, [effectiveMemoryId, memoryId, resumeAfterVoice, router, voice]);

  const chooseVoice = useCallback((id: VoiceId) => {
```

Replace it with:

```tsx
      }, 350);
    }
  }, [effectiveMemoryId, memoryId, router, voice]);

  const chooseVoice = useCallback((id: VoiceId) => {
```

In `app/voice-call.tsx`, find:

```tsx
  }, [close, stage, voice.recordingTime]);

  if (hydratedForUser !== userKey || isHydrating) {
    return (
```

Replace it with:

```tsx
  }, [close, stage, voice.recordingTime]);

  // Leaving the screen keeps the call going in the floating call bar.
  const minimize = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/chat');
  }, [router]);

  if (hydratedForUser !== userKey || isHydrating) {
    return (
```

In `app/voice-call.tsx`, find:

```tsx
            End call
          </Button>
          <Pressable onPress={openSettings} className="size-11 items-center justify-center rounded-full border border-stroke-weak bg-fill-weaker">
            <Settings size={22} color={COLORS.textBase} />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center pb-28">
```

Replace it with:

```tsx
            End call
          </Button>
          <View className="flex-row items-center gap-2">
            {live ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Minimize call"
                onPress={minimize}
                className="size-11 items-center justify-center rounded-full border border-stroke-weak bg-fill-weaker"
              >
                <ChevronDown size={22} color={COLORS.textBase} />
              </Pressable>
            ) : null}
            <Pressable onPress={openSettings} className="size-11 items-center justify-center rounded-full border border-stroke-weak bg-fill-weaker">
              <Settings size={22} color={COLORS.textBase} />
            </Pressable>
          </View>
        </View>
        <View className="flex-1 items-center justify-center pb-28">
```

- [ ] **Step 4: Verify the whole app**

Run: `bun run typecheck && bun run lint && bun run check:typography && bun test`
Expected: no type errors, no lint errors, the typography check passes, and `0 fail`.

- [ ] **Step 5: Commit**

```bash
git add app/voice-call.tsx src/features/chat/voice-call-provider-contract.test.ts src/features/chat/voice-call-route.test.ts
git commit -m "feat(voice): call screen is a view onto the app-wide call" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Device checklist

**Files:**
- Modify: `docs/testing/fluid-voice-device-checklist.md`

- [ ] **Step 1: Append the checklist**

Append this section:

```markdown
## Call actions (2026-10-01 design)

Run against an API with the call actions plan deployed.

- [ ] Say "okay, let's talk later". Memento says a short goodbye, the goodbye plays to the end, then the call ends and the call screen closes.
- [ ] Say "I'm tired". Memento asks whether to wrap up and does not hang up on its own.
- [ ] Say "hold on, stop listening". Memento says it will wait, the call screen shows muted, and tapping Unmute restores the microphone.
- [ ] Say "show me my stories". Memento asks whether to keep talking or wrap up. Answer "keep talking": the Stories tab opens and the floating bar shows the live call. Tap the bar to return to the call screen.
- [ ] Repeat and answer "wrap up": Memento says goodbye, the call ends, and the Stories tab opens.
- [ ] During a call, tap the minimize arrow. The call continues in the floating bar. End it from the bar's red button.
- [ ] Sign out during a minimized call. The call ends.
- [ ] Background music pauses during a call, including while minimized, and resumes after it ends.
```

- [ ] **Step 2: Commit**

```bash
git add docs/testing/fluid-voice-device-checklist.md
git commit -m "docs(voice): call actions device checklist" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
