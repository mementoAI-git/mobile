# Voice Stopgaps (Mobile) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the current Gemini Live voice mode noticeably better before the LiveKit migration: server-built context and greeting, voice interruption on speaker, per-turn transcript saving, and no clicks in iOS playback.

**Architecture:** The API now builds all voice context and returns a greeting instruction with the token (API plan `api/docs/superpowers/plans/2026-09-30-voice-brain-api.md`, Tasks 1 to 9). The app stops assembling context the API ignores. The speaker mic gate and greeting shield move behind a flag, relying on iOS voice processing, Android's voice-communication preset, and the API's calmer start-of-speech detection. Completed turns go to `POST /ai/voice/turns` as they happen. The C++ renderer gets 5 ms fades at every discontinuity. When Gemini warns that it will close the connection, or the network drops, the app reconnects with a server-minted resume token, so calls continue past 10 minutes.

**Tech Stack:** Expo 57, React Native 0.86, `@google/genai/web`, `react-native-audio-api` nightly, C++20 native module, Bun test.

**Strategy:** `api/docs/superpowers/specs/2026-09-30-voice-experience-strategy.md`. This plan is Phase 1b. Most of this code is deleted in Phase 4 when LiveKit replaces the transport, so keep changes small and do not refactor beyond what each task needs.

## Global Constraints

- Ship after the API plan's Tasks 1 to 9 are deployed. Task 1 feature-detects the new API, so the app still works against an older API.
- Tests: `bun test <path>`. Types: `bun run typecheck`. Lint: `bun run lint`.
- New flags are `EXPO_PUBLIC_*` env vars set per profile in `eas.json`.
- Do not change `/memories/add-message` usage for servers that lack `/ai/voice/turns`.
- Physical-device validation uses `docs/testing/fluid-voice-device-checklist.md`. The simulator does not reproduce echo or voice processing.

## File Structure

| File | Responsibility |
| --- | --- |
| Modify `src/features/chat/voice-live-config.ts` | Parse `greetingInstruction`, `memoryId`, and API capability from the token |
| Modify `src/hooks/use-voice-mode.ts` | Use server greeting, drop ignored context, wire flag and turn sync |
| Modify `src/features/chat/voice-audio-engine.ts` | `speakerFullDuplex` option |
| Create `src/features/chat/voice-turn-sync.ts` | Ordered, retrying, idempotent per-turn upload |
| Modify `src/api/endpoint.ts` | `voiceTurns` endpoint |
| Modify `modules/react-native-memento-voice/common/cpp/mementovoice/VoicePlaybackSession.{h,cpp}` | De-click fades |
| Create `modules/react-native-memento-voice/common/cpp/tests/declick_test.cpp` | Standalone C++ test |
| Modify `src/features/chat/native-voice-playback-controller.ts` | Larger native jitter buffer targets |
| Modify `src/features/chat/voice-message-handler.ts` | Emit resume-handle and go-away effects |
| Modify `package.json`, `eas.json` | Native test script, flag values |

---

### Task 1: Use the server greeting and stop sending ignored context

The API locks the Live config inside the token, so everything the app puts into `buildGeminiLiveConfig` is ignored. The greeting is the only client-sent content that reaches the model.

**Files:**
- Modify: `src/features/chat/voice-live-config.ts`
- Modify: `src/hooks/use-voice-mode.ts:511-639`
- Test: `src/features/chat/voice-live-config.test.ts`

**Interfaces:**
- Consumes: token response `data` fields `greetingInstruction?: string`, `memoryId?: string | null`, `promptVersion?: string` from API Task 6
- Produces: `VoiceLiveToken` gains `greetingInstruction?: string`, `memoryId?: string`, `supportsVoiceTurns: boolean`

- [ ] **Step 1: Write the failing test**

Two existing tests compare the whole parsed token with `toEqual`. They must include the new required field. In `src/features/chat/voice-live-config.test.ts`, add `supportsVoiceTurns: false,` as the last property of the expected object in both "uses the API model and voice" and "uses the one-release compatibility model for an older API response".

Then append inside the `describe`:

```ts
  test('parses the server greeting, memory and turn support from the token payload', () => {
    const parsed = parseVoiceLiveToken(
      {
        token: 'auth_tokens/abc',
        live: { model: 'gemini-3.8-live', voice: { name: 'Kore' } },
        greetingInstruction: 'Greet Sam in one short sentence.',
        memoryId: '64b000000000000000000001',
        promptVersion: 'voice-2026-09-30',
      },
      'Fenrir',
    );

    expect(parsed.greetingInstruction).toBe('Greet Sam in one short sentence.');
    expect(parsed.memoryId).toBe('64b000000000000000000001');
    expect(parsed.supportsVoiceTurns).toBe(true);
  });

  test('older API responses leave greeting unset and do not claim turn support', () => {
    const parsed = parseVoiceLiveToken({ token: 'auth_tokens/abc', memoryId: null }, 'Fenrir');

    expect(parsed.greetingInstruction).toBeUndefined();
    expect(parsed.memoryId).toBeUndefined();
    expect(parsed.supportsVoiceTurns).toBe(false);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test src/features/chat/voice-live-config.test.ts`
Expected: four tests FAIL: the two new ones, and the two updated ones because `supportsVoiceTurns` is missing.

- [ ] **Step 3: Extend the parser**

In `src/features/chat/voice-live-config.ts`, extend the type:

```ts
export type VoiceLiveToken = {
  token: string;
  model: string;
  voiceName: string;
  systemInstruction?: string;
  greetingInstruction?: string;
  memoryId?: string;
  /** True when the API records voice turns via POST /ai/voice/turns. */
  supportsVoiceTurns: boolean;
};
```

Replace the `return` of `parseVoiceLiveToken` with:

```ts
  return {
    token: response.token,
    model: nonEmptyString(live.model) ? live.model : LEGACY_LIVE_MODEL,
    voiceName: nonEmptyString(voice.name) ? voice.name : fallbackVoiceName,
    systemInstruction: nonEmptyString(response.systemInstruction)
      ? (response.systemInstruction as string)
      : undefined,
    greetingInstruction: nonEmptyString(response.greetingInstruction)
      ? response.greetingInstruction
      : undefined,
    memoryId:
      nonEmptyString(response.memoryId) && /^[0-9a-fA-F]{24}$/.test(response.memoryId)
        ? response.memoryId
        : undefined,
    supportsVoiceTurns: nonEmptyString(response.promptVersion),
  };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test src/features/chat/voice-live-config.test.ts`
Expected: PASS.

- [ ] **Step 5: Simplify `connect` in the hook**

In `src/hooks/use-voice-mode.ts`, inside `connect`:

1. Delete everything from the comment `// 1. Gather recent conversation messages from query cache or network` through `const assembledContext = contextBlocks.join('\n\n');`.
2. Keep the existing `const user = useUserStore.getState().user;` line. Replace the line after it, `const targetMemoryId = memoryIdRef.current;`, with:

```ts
      if (liveToken.memoryId) memoryIdRef.current = liveToken.memoryId;
```

3. Change the `config:` argument of `client.live.connect` to:

```ts
        // The token locks the real config server-side. This only satisfies the SDK.
        config: buildGeminiLiveConfig(liveToken.voiceName, user),
```

4. Replace the whole `const userGreetingName = ...` and `const greetingPrompt = ...` block with:

```ts
      const userGreetingName = user?.nickname || user?.first_name || '';
      const greetingPrompt =
        liveToken.greetingInstruction ??
        `Start with a brief, warm greeting in English${
          userGreetingName ? ` to ${userGreetingName}` : ''
        }. Then let them lead.`;
```

5. Remove imports that are now unused: `getConversationMessagesUrl`. Keep `queryClient` and `queryKeys` if other code in the file still uses them.

- [ ] **Step 6: Typecheck, lint, and test**

Run: `bun run typecheck && bun run lint && bun test src/features/chat`
Expected: no errors, all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/features/chat/voice-live-config.ts src/features/chat/voice-live-config.test.ts src/hooks/use-voice-mode.ts
git commit -m "feat(voice): use server greeting and drop ignored client context"
```

---

### Task 2: Voice interruption on speaker, behind a flag

Today the app drops the mic while model audio is audible on the loudspeaker, so users cannot interrupt by voice. The API now requires 200 ms of speech with low start sensitivity before it counts as an interruption. Together with iOS voice processing and Android's voice-communication preset, that should keep echo from cutting the model off. The flag lets us compare on devices.

**Files:**
- Modify: `src/features/chat/voice-audio-engine.ts`
- Modify: `src/hooks/use-voice-mode.ts`
- Modify: `eas.json`
- Test: `src/features/chat/voice-audio-engine.test.ts`

**Interfaces:**
- Consumes: nothing new
- Produces: `VoiceAudioEngineOptions.speakerFullDuplex?: boolean` (default `false`)

- [ ] **Step 1: Write the failing test**

Append inside the `describe` in `src/features/chat/voice-audio-engine.test.ts`:

```ts
  test('streams mic audio during loudspeaker playback when speaker full duplex is enabled', async () => {
    const native = new FakeNative();
    native.isHeadphonesDevice = false;
    const chunks: string[] = [];
    const engine = new VoiceAudioEngine({ native, speakerFullDuplex: true });

    await engine.start((chunk) => chunks.push(chunk));
    engine.armGreetingShield();

    const pcmSamples = new Float32Array(4800).fill(0.1);
    const pcmBase64 = btoa(String.fromCharCode(...new Uint8Array(pcmSamples.length * 2)));
    engine.enqueueOutput(pcmBase64, 1);
    expect(engine.isPlaying()).toBe(true);

    const userVoice = new Float32Array(1_600).fill(0.1);
    native.recorder.input?.({
      buffer: { getChannelData: () => userVoice },
      numFrames: 1_600,
    });

    expect(chunks).toHaveLength(1);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test src/features/chat/voice-audio-engine.test.ts`
Expected: the new test FAILS with `expect(chunks).toHaveLength(1)` receiving 0. The TypeScript option error does not stop Bun from running it.

- [ ] **Step 3: Add the option**

In `src/features/chat/voice-audio-engine.ts`:

```ts
export type VoiceAudioEngineOptions = {
  native?: VoiceAudioNativeAdapter;
  metrics?: VoiceSessionMetrics;
  /** Stream the mic while model audio plays on the loudspeaker. Relies on OS echo cancellation. */
  speakerFullDuplex?: boolean;
  onFatalError?: (error: Error) => void;
  onPlaybackStateChange?: (
    state: 'idle' | 'prebuffering' | 'playing' | 'stopped',
  ) => void;
};
```

Add a field and set it in the constructor:

```ts
  private readonly speakerFullDuplex: boolean;
```

```ts
    this.speakerFullDuplex = options.speakerFullDuplex ?? false;
```

In the recorder callback, change the speaker gate line to:

```ts
          if (!this.speakerFullDuplex && !this.isHeadphones && this.isAudible(200)) return;
```

Change `armGreetingShield`:

```ts
  armGreetingShield(): void {
    if (this.speakerFullDuplex) return;
    this.greetingShieldActive = true;
  }
```

- [ ] **Step 4: Run the tests**

Run: `bun test src/features/chat/voice-audio-engine.test.ts`
Expected: PASS, including the existing gating tests, which use the default `false`.

- [ ] **Step 5: Wire the flag in the hook**

At module scope in `src/hooks/use-voice-mode.ts`:

```ts
const SPEAKER_FULL_DUPLEX = process.env.EXPO_PUBLIC_VOICE_FULL_DUPLEX === 'true';
```

In `connect`, change `isGreetingActiveRef.current = true;` to:

```ts
    isGreetingActiveRef.current = !SPEAKER_FULL_DUPLEX;
```

Pass the option when constructing the engine:

```ts
    const engine = new VoiceAudioEngine({
      speakerFullDuplex: SPEAKER_FULL_DUPLEX,
      onFatalError: (error) => {
```

Wrap the greeting safety timer so it only runs when the shield is used:

```ts
      if (!SPEAKER_FULL_DUPLEX) {
        if (greetingTimerRef.current) clearTimeout(greetingTimerRef.current);
        greetingTimerRef.current = setTimeout(() => {
          isGreetingActiveRef.current = false;
          engineRef.current?.disarmGreetingShield();
        }, 4500);
      }
```

- [ ] **Step 6: Set the flag per build profile**

In `eas.json`, next to each existing `"EXPO_PUBLIC_NATIVE_VOICE_PLAYBACK": "true"`, add `"EXPO_PUBLIC_VOICE_FULL_DUPLEX"`. Use `"true"` for the development and preview profiles and `"false"` for production until Task 6 passes.

- [ ] **Step 7: Typecheck, lint, commit**

Run: `bun run typecheck && bun run lint`
Expected: no errors.

```bash
git add src/features/chat/voice-audio-engine.ts src/features/chat/voice-audio-engine.test.ts src/hooks/use-voice-mode.ts eas.json
git commit -m "feat(voice): allow voice interruption on speaker behind a flag"
```

---

### Task 3: Save each turn as it completes

**Files:**
- Create: `src/features/chat/voice-turn-sync.ts`
- Modify: `src/api/endpoint.ts`
- Modify: `src/hooks/use-voice-mode.ts`
- Test: `src/features/chat/voice-turn-sync.test.ts`

**Interfaces:**
- Consumes: `VoiceTranscriptTurn` from `voice-transcript-turns.ts`, `supportsVoiceTurns` and `memoryId` from Task 1, `POST /ai/voice/turns` from API Task 8
- Produces:
  - `type VoiceTurnPayload = {index: number; role: 'user' | 'ai'; text: string; interrupted?: boolean}`
  - `type VoiceTurnPoster = (url: string, body: {session_id: string; memory_id?: string; turns: VoiceTurnPayload[]}) => Promise<unknown>`
  - `class VoiceTurnSync` with `addTurns(turns, options?)`, `flush(): Promise<boolean>`, `hasPending(): boolean`, `getMemoryId(): string | undefined`

- [ ] **Step 1: Write the failing test**

```ts
// src/features/chat/voice-turn-sync.test.ts
import { describe, expect, test } from 'bun:test';

import { VoiceTurnSync, type VoiceTurnPoster } from './voice-turn-sync';

const turn = (user: string, ai: string) => ({
  messages: [
    { role: 'user' as const, text: user, is_voice: true as const },
    { role: 'ai' as const, text: ai, is_voice: true as const },
  ],
});

function recorder(responses: Array<unknown | Error> = []) {
  const calls: Array<{ url: string; body: any }> = [];
  const post: VoiceTurnPoster = async (url, body) => {
    calls.push({ url, body: JSON.parse(JSON.stringify(body)) });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    // Like the real API, echo the memory the client sent, or create one.
    return next ?? { data: { memory_id: body.memory_id ?? 'm1' } };
  };
  return { calls, post };
}

describe('VoiceTurnSync', () => {
  test('assigns increasing indexes across turns and skips blank text', async () => {
    const { calls, post } = recorder();
    const sync = new VoiceTurnSync(post, '/ai/voice/turns', 's1');

    sync.addTurns([turn('hi', 'hey'), turn('  ', 'still here')]);
    await sync.flush();

    expect(calls).toHaveLength(1);
    expect(calls[0].body.turns.map((t: any) => [t.index, t.role, t.text])).toEqual([
      [0, 'user', 'hi'],
      [1, 'ai', 'hey'],
      [2, 'ai', 'still here'],
    ]);
  });

  test('sends batches in order without duplicating turns', async () => {
    const { calls, post } = recorder();
    const sync = new VoiceTurnSync(post, '/ai/voice/turns', 's1');

    sync.addTurns([turn('a', 'b')]);
    sync.addTurns([turn('c', 'd')]);
    await sync.flush();

    const indexes = calls.flatMap((c) => c.body.turns.map((t: any) => t.index));
    expect(indexes).toEqual([0, 1, 2, 3]);
  });

  test('keeps turns after a failure and retries them on the next flush', async () => {
    // addTurns flushes immediately, so fail that attempt and the explicit one.
    const { calls, post } = recorder([new Error('offline'), new Error('offline')]);
    const sync = new VoiceTurnSync(post, '/ai/voice/turns', 's1');

    sync.addTurns([turn('a', 'b')]);
    expect(await sync.flush()).toBe(false);
    expect(sync.hasPending()).toBe(true);

    expect(await sync.flush()).toBe(true);
    expect(sync.hasPending()).toBe(false);
    expect(calls.at(-1)?.body.turns.map((t: any) => t.index)).toEqual([0, 1]);
  });

  test('adopts the memory id returned by the server for later batches', async () => {
    const { calls, post } = recorder([{ data: { memory_id: 'created' } }]);
    const sync = new VoiceTurnSync(post, '/ai/voice/turns', 's1');

    sync.addTurns([turn('a', 'b')]);
    await sync.flush();
    sync.addTurns([turn('c', 'd')]);
    await sync.flush();

    expect(calls[0].body.memory_id).toBeUndefined();
    expect(calls.at(-1)?.body.memory_id).toBe('created');
    expect(sync.getMemoryId()).toBe('created');
  });

  test('marks only the last AI message as interrupted', async () => {
    const { calls, post } = recorder();
    const sync = new VoiceTurnSync(post, '/ai/voice/turns', 's1', 'm0');

    sync.addTurns([turn('a', 'b'), turn('c', 'd')], { interruptedLast: true });
    await sync.flush();

    expect(calls[0].body.memory_id).toBe('m0');
    expect(calls[0].body.turns.filter((t: any) => t.interrupted).map((t: any) => t.text)).toEqual(['d']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test src/features/chat/voice-turn-sync.test.ts`
Expected: FAIL with "Cannot find module './voice-turn-sync'".

- [ ] **Step 3: Write the implementation**

```ts
// src/features/chat/voice-turn-sync.ts
import type { VoiceTranscriptTurn } from './voice-transcript-turns';

export type VoiceTurnPayload = {
  index: number;
  role: 'user' | 'ai';
  text: string;
  interrupted?: boolean;
};

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
  ) {
    this.memoryId = memoryId;
  }

  addTurns(turns: VoiceTranscriptTurn[], options: { interruptedLast?: boolean } = {}): void {
    turns.forEach((turn, turnIndex) => {
      const isLastTurn = turnIndex === turns.length - 1;
      for (const message of turn.messages) {
        const text = message.text.trim();
        if (!text) continue;
        const interrupted = options.interruptedLast && isLastTurn && message.role === 'ai';
        this.pending.push({
          index: this.nextIndex++,
          role: message.role,
          text,
          ...(interrupted ? { interrupted: true } : {}),
        });
      }
    });
    if (this.pending.length) void this.flush();
  }

  flush(): Promise<boolean> {
    this.chain = this.chain.then(() => this.flushPending());
    return this.chain;
  }

  hasPending(): boolean {
    return this.pending.length > 0;
  }

  getMemoryId(): string | undefined {
    return this.memoryId;
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
        const memoryId = (response as { data?: { memory_id?: unknown } } | undefined)?.data
          ?.memory_id;
        if (typeof memoryId === 'string' && memoryId) this.memoryId = memoryId;
        this.pending.splice(0, batch.length);
      } catch {
        return false;
      }
    }
    return true;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test src/features/chat/voice-turn-sync.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Add the endpoint**

In `src/api/endpoint.ts`, next to `ephemeralToken`:

```ts
  voiceTurns: '/ai/voice/turns',
```

- [ ] **Step 6: Wire the sync into the hook**

In `src/hooks/use-voice-mode.ts`:

1. Import:

```ts
import { VoiceTurnSync } from '@/features/chat/voice-turn-sync';
```

2. Add refs next to the other refs:

```ts
  const turnSyncRef = useRef<VoiceTurnSync | null>(null);
```

3. Extract the target-memory lookup out of `persistVoiceMessages` into a function above it, and make `persistVoiceMessages` call it:

```ts
  const resolveTargetMemoryId = useCallback((): string | undefined => {
    const cachedProfile = queryClient.getQueryData<any>(queryKeys.profile);
    const userPrimaryId =
      useUserStore.getState().user?.primary_conversation_id ??
      useAuthStore.getState().user?.primary_conversation_id ??
      cachedProfile?.primary_conversation_id;
    const rawTargetId = memoryIdRef.current || userPrimaryId;
    return rawTargetId && /^[0-9a-fA-F]{24}$/.test(rawTargetId) ? rawTargetId : undefined;
  }, []);
```

In `persistVoiceMessages`, replace the lines from `const cachedProfile` through `const targetMemoryId = ...` with `const targetMemoryId = resolveTargetMemoryId();`, and add `resolveTargetMemoryId` to its dependency array.

4. Add a helper before `handleLiveMessage`:

```ts
  const syncCompletedTurns = useCallback((interruptedLast = false) => {
    const completed = transcriptRef.current.drainCompleted();
    if (completed.length) turnSyncRef.current?.addTurns(completed, { interruptedLast });
  }, []);
```

5. In `handleLiveMessage`, call it after every place a turn completes, and add `syncCompletedTurns` to its dependency array:
   - In the `interrupted` branch, after `transcriptRef.current.completeTurn();` add `syncCompletedTurns(true);`
   - After each of the three `transcriptRef.current.settlePendingTurn();` calls add `syncCompletedTurns();`

6. In `connect`, right after the Task 1 line `if (liveToken.memoryId) memoryIdRef.current = liveToken.memoryId;`:

```ts
      turnSyncRef.current = liveToken.supportsVoiceTurns
        ? new VoiceTurnSync(
            (url, body) => post(url, body),
            endpoint.voiceTurns,
            sessionIdRef.current,
            resolveTargetMemoryId(),
          )
        : null;
```

Add `resolveTargetMemoryId` to `connect`'s dependency array.

7. In `disconnect`, replace everything from `const sessionTurns = transcriptRef.current.getSessionTurns();` through the end of the `transcriptPersisted` assignment with:

```ts
    const sessionTurns = transcriptRef.current.getSessionTurns();
    const flattenedSessionMessages = sessionTurns.flatMap((turn) => turn.messages);
    const formattedDuration = formatVoiceCallDuration(finalDuration);
    const turnSync = turnSyncRef.current;
    turnSyncRef.current = null;

    let callRecordText = '';
    let transcriptPersisted = false;

    if (turnSync) {
      syncCompletedTurnsInto(turnSync, transcriptRef.current);
      transcriptPersisted = await turnSync.flush();
      if (!transcriptPersisted) {
        await wait(1_000);
        transcriptPersisted = await turnSync.flush();
      }
      const savedMemoryId = turnSync.getMemoryId();
      if (savedMemoryId) {
        memoryIdRef.current = savedMemoryId;
        void queryClient.invalidateQueries({ queryKey: queryKeys.promptMessages(savedMemoryId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.memory(savedMemoryId) });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.memories() });
      if (!transcriptPersisted) logger.error('Voice turns could not be saved after retry');
    } else {
      transcriptRef.current.drainCompleted();
      if (sessionTurns.length > 0) {
        callRecordText = serializeVoiceCallTranscript(formattedDuration, flattenedSessionMessages);
      } else if (finalDuration >= 3) {
        const userText = userSpeechTextRef.current.trim();
        const aiText =
          aiSpeechTextRef.current.trim() &&
          !aiSpeechTextRef.current.includes('Ready to connect') &&
          !aiSpeechTextRef.current.includes('Connecting')
            ? aiSpeechTextRef.current.trim()
            : '';
        const fallbackTurns: Array<{ role: 'user' | 'ai'; text: string }> = [];
        if (userText) fallbackTurns.push({ role: 'user', text: userText });
        if (aiText) fallbackTurns.push({ role: 'ai', text: aiText });
        callRecordText = serializeVoiceCallTranscript(formattedDuration, fallbackTurns);
      }
      transcriptPersisted = callRecordText
        ? await persistVoiceMessages([
            { role: 'ai', text: callRecordText, is_voice: true, duration: finalDuration },
          ])
        : false;
    }
```

Add this helper at module scope, above `useVoiceMode`, because `turnSyncRef` is already cleared when it runs:

```ts
function syncCompletedTurnsInto(
  sync: VoiceTurnSync,
  transcript: VoiceTranscriptTurns,
): void {
  const completed = transcript.drainCompleted();
  if (completed.length) sync.addTurns(completed);
}
```

Leave the existing `logger.runtime('[VoiceMode] transcript metrics', ...)` call as is. It still reads `sessionTurns`, `flattenedSessionMessages`, `callRecordText` and `transcriptPersisted`.

- [ ] **Step 7: Typecheck, lint, test**

Run: `bun run typecheck && bun run lint && bun test src/features/chat`
Expected: no errors, all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/features/chat/voice-turn-sync.ts src/features/chat/voice-turn-sync.test.ts src/api/endpoint.ts src/hooks/use-voice-mode.ts
git commit -m "feat(voice): save voice turns as they complete"
```

---

### Task 4: De-click the iOS native renderer

`VoicePlaybackSession::render` steps straight to zero when the buffer runs dry and cuts mid-waveform on interrupt. Both are audible clicks. The fix adds 5 ms ramps: fade in after silence, fade out a partial quantum's tail, and decay from the last sample when nothing new is available. This was prototyped against the current source on 2026-09-30. The test below fails on all three cases today, with a maximum step of 0.5, and passes with the change, with a maximum step under 0.006.

**Files:**
- Modify: `modules/react-native-memento-voice/common/cpp/mementovoice/VoicePlaybackSession.h`
- Modify: `modules/react-native-memento-voice/common/cpp/mementovoice/VoicePlaybackSession.cpp`
- Create: `modules/react-native-memento-voice/common/cpp/tests/declick_test.cpp`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing new
- Produces: `bun run test:native-voice`. No API change to the native module.

- [ ] **Step 1: Write the failing test**

```cpp
// modules/react-native-memento-voice/common/cpp/tests/declick_test.cpp
#include "mementovoice/VoicePlaybackSession.h"

#include <chrono>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <memory>
#include <string>
#include <thread>
#include <vector>

using namespace mementovoice;

namespace {

std::string pcm16Base64Constant(float value, size_t frames) {
  static const char *alphabet =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  std::vector<uint8_t> bytes;
  const auto sample = static_cast<int16_t>(value * 32767.0f);
  for (size_t i = 0; i < frames; ++i) {
    bytes.push_back(static_cast<uint8_t>(sample & 0xff));
    bytes.push_back(static_cast<uint8_t>((sample >> 8) & 0xff));
  }
  std::string out;
  size_t i = 0;
  for (; i + 2 < bytes.size(); i += 3) {
    const uint32_t n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += alphabet[(n >> 18) & 63];
    out += alphabet[(n >> 12) & 63];
    out += alphabet[(n >> 6) & 63];
    out += alphabet[n & 63];
  }
  if (i + 1 == bytes.size()) {
    const uint32_t n = bytes[i] << 16;
    out += alphabet[(n >> 18) & 63];
    out += alphabet[(n >> 12) & 63];
    out += "==";
  } else if (i + 2 == bytes.size()) {
    const uint32_t n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += alphabet[(n >> 18) & 63];
    out += alphabet[(n >> 12) & 63];
    out += alphabet[(n >> 6) & 63];
    out += '=';
  }
  return out;
}

float maxStep(const std::vector<float> &samples) {
  float worst = 0.0f;
  for (size_t i = 1; i < samples.size(); ++i) {
    worst = std::max(worst, std::fabs(samples[i] - samples[i - 1]));
  }
  return worst;
}

PlaybackOptions testOptions() {
  PlaybackOptions options;
  options.sourceSampleRate = 24000;
  options.targetSampleRate = 48000;
  options.startupBufferMs = 20;
  options.recoveryBufferMs = 20;
  options.maxBufferedMs = 5000;
  return options;
}

void waitForBuffered(VoicePlaybackSession &session, double ms) {
  for (int i = 0; i < 1000 && session.snapshot().bufferedMs < ms; ++i) {
    std::this_thread::sleep_for(std::chrono::milliseconds(1));
  }
}

void renderQuanta(VoicePlaybackSession &session, int quanta, std::vector<float> &out) {
  float buffer[128];
  for (int q = 0; q < quanta; ++q) {
    session.render(buffer, 128);
    out.insert(out.end(), buffer, buffer + 128);
  }
}

int failures = 0;

void expectSmooth(const char *name, const std::vector<float> &samples) {
  const float step = maxStep(samples);
  const bool ok = step < 0.02f;
  std::printf("%s %s (max step %.4f)\n", ok ? "PASS" : "FAIL", name, step);
  if (!ok) ++failures;
}

}  // namespace

int main() {
  {
    VoicePlaybackSession session(testOptions());
    session.start(1, 1);
    session.pushPCM(pcm16Base64Constant(0.5f, 1200), 1, 1, 0);  // 50 ms, turn stays open
    waitForBuffered(session, 45.0);
    std::vector<float> out{0.0f};  // silence before playback
    renderQuanta(session, 30, out);  // ~80 ms, so it underruns mid-way
    expectSmooth("underrun fades out instead of stepping to silence", out);
    session.stop(1);
  }
  {
    VoicePlaybackSession session(testOptions());
    session.start(1, 1);
    session.pushPCM(pcm16Base64Constant(0.5f, 4800), 1, 1, 0);  // 200 ms
    waitForBuffered(session, 190.0);
    std::vector<float> out{0.0f};  // silence before playback
    renderQuanta(session, 8, out);
    session.interrupt(1, 2);
    renderQuanta(session, 8, out);
    expectSmooth("interrupt decays instead of cutting mid-waveform", out);
    session.stop(1);
  }
  {
    VoicePlaybackSession session(testOptions());
    session.start(1, 1);
    session.pushPCM(pcm16Base64Constant(0.5f, 2400), 1, 1, 0);  // 100 ms
    waitForBuffered(session, 95.0);
    std::vector<float> out{0.0f};  // silence before playback
    renderQuanta(session, 4, out);
    expectSmooth("playback start fades in from silence", out);
    session.stop(1);
  }
  return failures == 0 ? 0 : 1;
}
```

Add a script to `package.json`:

```json
    "test:native-voice": "mkdir -p .native-test && clang++ -std=c++20 -O1 -pthread -Wall -I modules/react-native-memento-voice/common/cpp modules/react-native-memento-voice/common/cpp/mementovoice/VoicePlaybackSession.cpp modules/react-native-memento-voice/common/cpp/tests/declick_test.cpp -o .native-test/declick_test && ./.native-test/declick_test",
```

Add `.native-test/` to `.gitignore`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test:native-voice`
Expected:

```
FAIL underrun fades out instead of stepping to silence (max step 0.5000)
FAIL interrupt decays instead of cutting mid-waveform (max step 0.5000)
FAIL playback start fades in from silence (max step 0.5000)
```

- [ ] **Step 3: Add the de-click state to the header**

In `VoicePlaybackSession.h`, after `static constexpr size_t kMaxIngressChunks = 128;`:

```cpp
  // 5 ms at 48 kHz. Long enough to remove clicks, short enough to be inaudible.
  static constexpr size_t kFadeFrames = 240;
```

After `void resetConverter() noexcept;`:

```cpp
  void applyDeclick(float *output, size_t written, size_t frameCount) noexcept;
```

After `size_t renderOffset_ = 0;`:

```cpp
  // Render-thread-only de-click state.
  float lastOutputSample_ = 0.0f;
  bool outputWasSilent_ = true;
```

- [ ] **Step 4: Apply the fades in `render`**

In `VoicePlaybackSession.cpp`, replace:

```cpp
  if (state != PlaybackState::Playing && state != PlaybackState::Draining) return 0;
```

with:

```cpp
  if (state != PlaybackState::Playing && state != PlaybackState::Draining) {
    applyDeclick(output, 0, frameCount);
    return 0;
  }
```

At the end of `render`, change `return written;` to:

```cpp
  applyDeclick(output, written, frameCount);
  return written;
```

Add the method after `render`:

```cpp
void VoicePlaybackSession::applyDeclick(
    float *output,
    size_t written,
    size_t frameCount) noexcept {
  if (written == 0) {
    // Nothing new to play (underrun, interrupt, idle). Decay from the last
    // emitted sample instead of stepping straight to zero.
    if (lastOutputSample_ != 0.0f) {
      const size_t fade = std::min(kFadeFrames, frameCount);
      for (size_t i = 0; i < fade; ++i) {
        output[i] = lastOutputSample_ *
            (1.0f - static_cast<float>(i + 1) / static_cast<float>(fade));
      }
    }
    lastOutputSample_ = 0.0f;
    outputWasSilent_ = true;
    return;
  }

  if (outputWasSilent_) {
    const size_t fade = std::min(kFadeFrames, written);
    for (size_t i = 0; i < fade; ++i) {
      output[i] *= static_cast<float>(i) / static_cast<float>(fade);
    }
  }

  if (written < frameCount) {
    // Ran dry inside this quantum: fade the tail we do have.
    const size_t fade = std::min(kFadeFrames, written);
    const size_t start = written - fade;
    for (size_t i = 0; i < fade; ++i) {
      output[start + i] *=
          1.0f - static_cast<float>(i + 1) / static_cast<float>(fade);
    }
    lastOutputSample_ = 0.0f;
    outputWasSilent_ = true;
    return;
  }

  lastOutputSample_ = output[frameCount - 1];
  outputWasSilent_ = false;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun run test:native-voice`
Expected:

```
PASS underrun fades out instead of stepping to silence (max step 0.0053)
PASS interrupt decays instead of cutting mid-waveform (max step 0.0039)
PASS playback start fades in from silence (max step 0.0039)
```

- [ ] **Step 6: Rebuild iOS and listen**

Run: `npx expo run:ios --device`
On a physical iPhone, hold a two-minute call on speaker over LTE. Expected: no clicks when the model pauses, is interrupted, or resumes after a network hiccup.

- [ ] **Step 7: Commit**

```bash
git add modules/react-native-memento-voice/common/cpp package.json .gitignore
git commit -m "fix(voice): fade native playback at underruns and interrupts"
```

---

### Task 5: Larger native jitter buffer targets

A fixed 180 ms startup buffer and 240 ms recovery buffer are too small for cellular jitter. Each late packet becomes an audible hole mid-word. Raise them for the native renderer only. The JavaScript fallback's constants stay as they are, because its tests hard-code chunk counts against them, and Phase 1c moves Android onto the native renderer anyway. This trades about 60 ms of response start for far fewer gaps. Phase 1c makes the buffer adaptive.

**Files:**
- Modify: `src/features/chat/native-voice-playback-controller.ts`

**Interfaces:**
- Produces: `NATIVE_VOICE_STARTUP_BUFFER_MS = 240` and `NATIVE_VOICE_RECOVERY_BUFFER_MS = 360`, exported from `native-voice-playback-controller.ts`

- [ ] **Step 1: Replace the imported constants**

In `src/features/chat/native-voice-playback-controller.ts`, replace:

```ts
import {
  VOICE_MAX_QUEUE_MS,
  VOICE_PREBUFFER_MS,
  VOICE_RECOVERY_PREBUFFER_MS,
} from './voice-playback-controller';
```

with:

```ts
import { VOICE_MAX_QUEUE_MS } from './voice-playback-controller';
```

Below `const NATIVE_STATE_POLL_MS = 50;` add:

```ts
// Deeper than the JS fallback's 180/240 ms: cellular jitter otherwise turns
// each late packet into an audible hole mid-word.
export const NATIVE_VOICE_STARTUP_BUFFER_MS = 240;
export const NATIVE_VOICE_RECOVERY_BUFFER_MS = 360;
```

In `createNativeVoicePlaybackSession`, change the two option lines to:

```ts
        startupBufferMs: NATIVE_VOICE_STARTUP_BUFFER_MS,
        recoveryBufferMs: NATIVE_VOICE_RECOVERY_BUFFER_MS,
```

- [ ] **Step 2: Typecheck and run the playback tests**

Run: `bun run typecheck && bun test src/features/chat`
Expected: no type errors, and `0 fail`. Do not change `VOICE_PREBUFFER_MS` or `VOICE_RECOVERY_PREBUFFER_MS` in `voice-playback-controller.ts`. Three existing tests depend on their values.

- [ ] **Step 3: Commit**

```bash
git add src/features/chat/native-voice-playback-controller.ts
git commit -m "tune(voice): raise native playback jitter buffer targets"
```

---

### Task 6: Reconnect on goAway and dropped connections

Gemini closes every Live connection after about 10 minutes and sends `goAway` first. Wi-Fi to cellular switches drop it too. Today either one ends the call. With the API's context compression (API Task 5), the session itself has no length cap, so the app only needs to reconnect to the same session. It keeps the latest `sessionResumptionUpdate.newHandle` and asks the API for a resume token (API Task 9). It opens a new connection and swaps it in while the audio engine keeps running. No greeting is sent on resume.

**Files:**
- Modify: `src/features/chat/voice-message-handler.ts`
- Modify: `src/hooks/use-voice-mode.ts`
- Test: `src/features/chat/voice-message-handler.test.ts`

**Interfaces:**
- Consumes: `GET /ai/ephemeral-token?resume_handle=` from API Task 9
- Produces: `VoiceMessageEffect` gains `{ type: 'resumption-handle'; handle: string }` and `{ type: 'go-away'; timeLeftMs: number }`

- [ ] **Step 1: Write the failing test**

Append inside the `describe` in `src/features/chat/voice-message-handler.test.ts`:

```ts
  test('emits resumable handles and go-away warnings', () => {
    const handler = new VoiceMessageHandler();

    expect(
      handler.handle({ sessionResumptionUpdate: { newHandle: 'h1', resumable: true } } as any, 1),
    ).toEqual([{ type: 'resumption-handle', handle: 'h1' }]);
    expect(
      handler.handle({ sessionResumptionUpdate: { newHandle: '', resumable: false } } as any, 1),
    ).toEqual([]);
    expect(handler.handle({ goAway: { timeLeft: '5s' } } as any, 1)).toEqual([
      { type: 'go-away', timeLeftMs: 5000 },
    ]);
    expect(handler.handle({ goAway: {} } as any, 1)).toEqual([
      { type: 'go-away', timeLeftMs: 0 },
    ]);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test src/features/chat/voice-message-handler.test.ts`
Expected: the new test FAILS, receiving `[]`.

- [ ] **Step 3: Emit the effects**

In `src/features/chat/voice-message-handler.ts`, extend the effect union:

```ts
export type VoiceMessageEffect =
  | { type: 'setup-complete' }
  | { type: 'output-audio'; data: string; epoch: number }
  | { type: 'input-transcript'; text: string; isInterim: boolean }
  | { type: 'output-transcript'; text: string; finished: boolean }
  | { type: 'interrupted' }
  | { type: 'turn-complete' }
  | { type: 'resumption-handle'; handle: string }
  | { type: 'go-away'; timeLeftMs: number };
```

Add a helper above the class:

```ts
/** Gemini sends durations as protobuf strings such as "5s" or "0.5s". */
function durationToMs(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value * 1_000;
  if (typeof value !== 'string') return 0;
  const seconds = Number.parseFloat(value);
  return Number.isFinite(seconds) ? seconds * 1_000 : 0;
}
```

In `handle`, directly after the `setupComplete` check and before `const content = ...`:

```ts
    const resumption = message.sessionResumptionUpdate ?? message.session_resumption_update;
    const newHandle = resumption?.newHandle ?? resumption?.new_handle;
    if (resumption?.resumable && typeof newHandle === 'string' && newHandle) {
      effects.push({ type: 'resumption-handle', handle: newHandle });
    }

    const goAway = message.goAway ?? message.go_away;
    if (goAway && typeof goAway === 'object') {
      effects.push({
        type: 'go-away',
        timeLeftMs: durationToMs(goAway.timeLeft ?? goAway.time_left),
      });
    }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test src/features/chat/voice-message-handler.test.ts`
Expected: PASS.

- [ ] **Step 5: Split session opening out of `connect`**

In `src/hooks/use-voice-mode.ts`:

1. Add the type import and constants:

```ts
import type { VoiceLiveToken } from '@/features/chat/voice-live-config';
```

```ts
const RECONNECT_DELAYS_MS = [0, 500, 1_500];
```

2. Add refs next to the others:

```ts
  const resumeHandleRef = useRef<string | null>(null);
  const reconnectingRef = useRef(false);
  const reconnectRef = useRef<(reason: 'go-away' | 'connection-lost') => Promise<boolean>>(
    async () => false,
  );
  const connectionLostRef = useRef<(closed: Session | null, isError: boolean) => Promise<void>>(
    async () => undefined,
  );
```

3. In `handleLiveMessage`, add two branches to the effect loop:

```ts
        } else if (effect.type === 'resumption-handle') {
          resumeHandleRef.current = effect.handle;
        } else if (effect.type === 'go-away') {
          logger.runtime('[VoiceMode] go-away', { timeLeftMs: effect.timeLeftMs });
          void reconnectRef.current('go-away');
```

4. Add `openLiveSession` after `disconnectRef` is declared. The `closed !== sessionRef.current` check in step 6 relies on `session` being assigned when a callback fires. If a callback fires during setup, before assignment, `session` is `null`, which matches a fresh call's empty `sessionRef` and is ignored during a reconnect.

```ts
  const openLiveSession = useCallback(
    async (liveToken: VoiceLiveToken): Promise<Session> => {
      const setupReady = createSetupReady();
      setupReadyRef.current = setupReady;
      const client = new GoogleGenAI({
        apiKey: liveToken.token,
        httpOptions: { apiVersion: 'v1alpha' },
      });
      let session: Session | null = null;
      session = await client.live.connect({
        model: liveToken.model,
        callbacks: {
          onopen: () => engineRef.current?.markConnectionOpen(),
          onmessage: handleLiveMessage,
          onerror: (error) => {
            logger.error('Live voice session failed', error);
            setupReady.reject(new Error('Voice session failed during setup.'));
            void connectionLostRef.current(session, true);
          },
          onclose: () => {
            setupReady.reject(new Error('Voice session closed during setup.'));
            void connectionLostRef.current(session, false);
          },
        },
        // The token locks the real config server-side. This only satisfies the SDK.
        config: buildGeminiLiveConfig(liveToken.voiceName, useUserStore.getState().user),
      });
      await setupReady.promise;
      return session;
    },
    [handleLiveMessage],
  );
```

- [ ] **Step 6: Add reconnect and connection-lost handling**

After `openLiveSession`:

```ts
  const reconnect = useCallback(
    async (reason: 'go-away' | 'connection-lost'): Promise<boolean> => {
      if (reconnectingRef.current) return true;
      if (!resumeHandleRef.current || !isSessionActiveRef.current) return false;
      reconnectingRef.current = true;
      const previous = sessionRef.current;
      logger.runtime('[VoiceMode] reconnecting', { reason });
      try {
        for (let attempt = 0; attempt < RECONNECT_DELAYS_MS.length; attempt += 1) {
          await wait(RECONNECT_DELAYS_MS[attempt]);
          if (!isSessionActiveRef.current) return false;
          try {
            const params = new URLSearchParams({ resume_handle: resumeHandleRef.current! });
            if (memoryIdRef.current) params.set('memory_id', memoryIdRef.current);
            const tokenResponse = await get<unknown>(`${endpoint.ephemeralToken}?${params}`);
            const liveToken = parseVoiceLiveToken(tokenResponse.data, voiceName ?? 'Fenrir');
            const next = await openLiveSession(liveToken);
            if (!isSessionActiveRef.current) {
              next.close();
              return false;
            }
            sessionRef.current = next;
            previous?.close();
            logger.runtime('[VoiceMode] reconnected', { reason, attempt });
            return true;
          } catch (error) {
            logger.warn('Voice reconnect attempt failed', error);
          }
        }
        return false;
      } finally {
        reconnectingRef.current = false;
      }
    },
    [openLiveSession, voiceName],
  );
  reconnectRef.current = reconnect;

  const handleConnectionLost = useCallback(
    async (closed: Session | null, isError: boolean): Promise<void> => {
      // Ignore the old socket closing after a successful swap.
      if (closed !== sessionRef.current) return;
      if (!isSessionActiveRef.current || isDisconnectingRef.current) return;
      if (reconnectingRef.current) return;
      if (resumeHandleRef.current && (await reconnect('connection-lost'))) return;
      if (isError && isMountedRef.current) {
        setConnectionFailure({
          kind: 'connection-error',
          message: 'Voice session was disconnected. Tap to reconnect.',
        });
      }
      await disconnectRef.current();
    },
    [reconnect],
  );
  connectionLostRef.current = handleConnectionLost;
```

- [ ] **Step 7: Use `openLiveSession` in `connect`**

In `connect`:

1. Add `resumeHandleRef.current = null;` next to the other resets at the top.
2. Delete `const setupReady = createSetupReady();` and `setupReadyRef.current = setupReady;` near the top. `openLiveSession` now owns them.
3. Replace the whole `const client = new GoogleGenAI(...)` and `sessionRef.current = await client.live.connect({...});` block with:

```ts
      sessionRef.current = await openLiveSession(liveToken);
```

4. Delete `await setupReady.promise;`. `openLiveSession` already waited for setup. `engine.start(...)` now runs after setup, so no mic audio can leak during the handshake.
5. Make the mic callback tolerate a closing socket during a swap:

```ts
      await engine.start((data) => {
        if (isMutedRef.current || isGreetingActiveRef.current) return;
        try {
          sessionRef.current?.sendRealtimeInput({
            audio: { data, mimeType: 'audio/pcm;rate=16000' },
          });
        } catch {
          // Socket is closing during a reconnect. Drop this 100 ms frame.
        }
      });
```

6. Add `openLiveSession` to `connect`'s dependency array.

- [ ] **Step 8: Typecheck, lint, test**

Run: `bun run typecheck && bun run lint && bun test src/features/chat`
Expected: no errors, all tests pass.

- [ ] **Step 9: Verify on a device**

Use a preview build against an API with Task 9 deployed.

1. Hold a call for 15 minutes. Expected: the `[VoiceMode] go-away` and `[VoiceMode] reconnected` logs appear, and the call continues. A gap under 2 seconds is acceptable. After reconnecting, ask the model something from before the reconnect. It should remember.
2. Mid-call, switch from Wi-Fi to cellular. Expected: `reconnecting` with reason `connection-lost`, then `reconnected`.
3. Turn on airplane mode for 10 seconds. Expected: three failed attempts, then the existing "Voice session was disconnected" error. Turns from before the drop are saved by Task 3.

- [ ] **Step 10: Commit**

```bash
git add src/features/chat/voice-message-handler.ts src/features/chat/voice-message-handler.test.ts src/hooks/use-voice-mode.ts
git commit -m "feat(voice): resume live sessions after goAway and network drops"
```

---

### Task 7: Device validation and flag decision

**Files:**
- Modify: `docs/testing/fluid-voice-device-checklist.md`

- [ ] **Step 1: Extend the checklist**

Add a section:

```markdown
## Phase 1b acceptance (2026-09-30 strategy)

Run each on one iPhone and one mid-range Android phone, loudspeaker, no headphones.

- [ ] Opened from a conversation with recent text turns, the greeting continues it without recapping
- [ ] Replies are one to three sentences unless asked for more
- [ ] Talking over the model stops it within about a quarter second
- [ ] 10 minutes of normal conversation produces no more than 1 false interruption (log count)
- [ ] No clicks at pauses, interruptions, or after a network hiccup (iOS)
- [ ] Every turn appears as its own message in the chat after the call
- [ ] Killing the app mid-call keeps every turn completed before the kill
- [ ] A 15-minute call survives the Gemini goAway reconnect, and the model still remembers earlier turns
- [ ] Switching Wi-Fi to cellular mid-call reconnects instead of ending the call
```

- [ ] **Step 2: Run the checklist with the flag on**

Use a preview build with `EXPO_PUBLIC_VOICE_FULL_DUPLEX=true`. Record the session metrics log lines `[VoiceMode] session metrics` and `[VoiceMode] transcript metrics` for each run.

- [ ] **Step 3: Decide the production flag value**

If false interruptions stay at or under 1 per 10 minutes on both phones, set `EXPO_PUBLIC_VOICE_FULL_DUPLEX` to `"true"` in the production profile of `eas.json`. If Android fails and iOS passes, keep production `"false"` and note the Android device model in the checklist. Android echo cancellation varies by device, which is one of the reasons for Phase 2.

- [ ] **Step 4: Commit**

```bash
git add docs/testing/fluid-voice-device-checklist.md eas.json
git commit -m "docs(voice): record phase 1b device validation"
```
