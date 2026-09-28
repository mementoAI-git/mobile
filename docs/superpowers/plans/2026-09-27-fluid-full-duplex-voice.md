# Fluid Full-Duplex Voice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Memento's jitter-prone mixed audio pipeline with a measured, full-duplex native pipeline that produces continuous Gemini speech, responsive turn-taking, and reliable interruption handling.

**Architecture:** The API owns the Gemini Live model and returns it with the ephemeral token. Mobile uses one `react-native-audio-api` session for 16 kHz microphone capture and 24 kHz queued playback, while the voice hook owns only Gemini/session state. Pure PCM, queue-state, token-contract, transcript-turn, and metrics modules keep native integration small and testable.

**Tech Stack:** Expo 57, React Native 0.86, TypeScript 6, Bun tests, `@google/genai/web`, `react-native-audio-api`, Vitest API tests, Gemini Live API.

**Spec:** `docs/superpowers/specs/2026-09-27-fluid-full-duplex-voice-design.md`

## Global Constraints

- Work on the existing `dev` branches in `/Users/dev/Workspace/memento/mobile` and `/Users/dev/Workspace/memento/api`; do not create or use a Codex worktree.
- Preserve the existing uncommitted fixes in `src/hooks/use-voice-mode.ts` and `src/features/chat/voice-provider-contract.test.ts` while replacing their temporary `expo-audio` session code.
- Mobile must continue importing Gemini from `@google/genai/web`.
- Input audio is raw signed 16-bit little-endian PCM, 16 kHz, mono, in approximately 100 ms chunks.
- Output audio is raw signed 16-bit little-endian PCM, 24 kHz, mono.
- Initial playback prebuffer is 120 ms with a 180 ms maximum startup wait; adaptive buffering is not part of this implementation.
- Automatic Gemini VAD remains enabled with `prefixPaddingMs: 40` and `silenceDurationMs: 650`; hybrid client VAD is deferred.
- Development API default is `gemini-3.8-live`; the API response and token constraint must use the same model value.
- Do not log raw PCM, transcripts, ephemeral tokens, or user-authored conversation content.
- Physical-device acoustic acceptance is led on an iPhone; Simulator is only a functional smoke test.
- Do not remove the `expo-audio` package or plugin because other recording features still depend on it.

## Review Focus

- A malformed or odd-byte Gemini audio chunk must be dropped and counted without crashing or poisoning later playback; Task 4 tests this.
- A second disconnect, close callback after manual disconnect, or unmount during setup must not stop/deactivate native resources twice; Tasks 5 and 7 test idempotency.
- A late audio chunk from an interrupted model turn must not restart stale speech; Tasks 5 and 7 test generation epochs.
- A token response from an older API deployment without `live.model` must use exactly the documented compatibility model, never a different hardcoded model; Task 2 tests this.
- Bluetooth loss, app backgrounding, and native recorder failure must leave the call in a reconnectable state with no active queue or microphone; Tasks 6 and 8 test and manually verify this.

---

### Task 1: Make the API the Gemini Live model authority

**Files:**
- Create: `/Users/dev/Workspace/memento/api/src/module/api/ai/live-session-config.ts`
- Create: `/Users/dev/Workspace/memento/api/test/ai/live-session-config.test.ts`
- Modify: `/Users/dev/Workspace/memento/api/src/module/api/ai/service.ts:1024-1072`
- Modify: `/Users/dev/Workspace/memento/api/src/utils/config.ts:89-92`
- Modify: `/Users/dev/Workspace/memento/api/.env.example:74`

**Interfaces:**
- Consumes: `GEMINI_LIVE_MODEL` and resolved `{ voiceId, voiceName }`.
- Produces: `buildLiveSessionDescriptor(model, voice)` returning `{ model, voice }`; ephemeral token data returning both legacy `voice` and new `live` fields.

- [ ] **Step 1: Write the failing pure contract test**

```ts
import {describe, expect, it} from 'vitest';
import {buildLiveSessionDescriptor} from '../../src/module/api/ai/live-session-config';

describe('Gemini Live session descriptor', () => {
  it('returns the exact model and resolved voice used by token constraints', () => {
    expect(
      buildLiveSessionDescriptor('gemini-3.8-live', {
        id: 'denver',
        name: 'Fenrir',
        provider: 'gemini',
      }),
    ).toEqual({
      model: 'gemini-3.8-live',
      voice: {id: 'denver', name: 'Fenrir', provider: 'gemini'},
    });
  });
});
```

- [ ] **Step 2: Run the API test and verify RED**

Run: `cd /Users/dev/Workspace/memento/api && bunx vitest run test/ai/live-session-config.test.ts`

Expected: FAIL because `live-session-config` does not exist.

- [ ] **Step 3: Add the pure descriptor**

```ts
export type GeminiVoiceDescriptor = {
  id: string;
  name: string;
  provider: 'gemini';
};

export function buildLiveSessionDescriptor(
  model: string,
  voice: GeminiVoiceDescriptor,
) {
  return {model, voice};
}
```

- [ ] **Step 4: Update the API default and example environment**

Set both the fallback in `src/utils/config.ts` and `GEMINI_LIVE_MODEL_VERSION` in `.env.example` to `gemini-3.8-live`. Do not modify `GEMINI_MODEL_VERSION`, which serves non-Live requests.

- [ ] **Step 5: Use one descriptor for the constraint and response**

In `createEphemeralToken`, construct:

```ts
const live = buildLiveSessionDescriptor(GEMINI_LIVE_MODEL, {
  id: voiceId,
  name: voiceName,
  provider: 'gemini',
});
```

Use `live.model` for `liveConnectConstraints.model` and `live.voice.name` for `prebuiltVoiceConfig.voiceName`. Return:

```ts
data: {
  token: token.name,
  expiresAt: expireTime.toISOString(),
  voice: live.voice,
  live,
}
```

The top-level `voice` remains for one-release compatibility.

- [ ] **Step 6: Verify API contract and suite**

Run:

```bash
cd /Users/dev/Workspace/memento/api
bunx vitest run test/ai/live-session-config.test.ts
bun run compile
bun run lint
bun test
```

Expected: focused test and complete API suite pass with zero failures.

- [ ] **Step 7: Commit the API contract**

```bash
cd /Users/dev/Workspace/memento/api
git add .env.example src/utils/config.ts src/module/api/ai/live-session-config.ts src/module/api/ai/service.ts test/ai/live-session-config.test.ts
git commit -m "feat(ai): expose authoritative Gemini Live model"
```

---

### Task 2: Parse the mobile token contract and build Live configuration

**Files:**
- Create: `src/features/chat/voice-live-config.ts`
- Create: `src/features/chat/voice-live-config.test.ts`
- Modify later in Task 7: `src/hooks/use-voice-mode.ts`

**Interfaces:**
- Consumes: unknown API response data and the user-selected fallback voice name.
- Produces: `parseVoiceLiveToken(data, fallbackVoiceName): VoiceLiveToken` and `buildGeminiLiveConfig(voiceName)`.

- [ ] **Step 1: Write failing response and VAD tests**

```ts
import {describe, expect, test} from 'bun:test';
import {
  buildGeminiLiveConfig,
  parseVoiceLiveToken,
} from './voice-live-config';

describe('voice Live configuration', () => {
  test('uses the API model and voice', () => {
    expect(parseVoiceLiveToken({
      token: 'ephemeral',
      live: {
        model: 'gemini-3.8-live',
        voice: {id: 'denver', name: 'Fenrir', provider: 'gemini'},
      },
    }, 'Aoede')).toEqual({
      token: 'ephemeral',
      model: 'gemini-3.8-live',
      voiceName: 'Fenrir',
    });
  });

  test('uses the one-release compatibility model for an older API response', () => {
    expect(parseVoiceLiveToken({token: 'ephemeral'}, 'Aoede')).toEqual({
      token: 'ephemeral',
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      voiceName: 'Aoede',
    });
  });

  test('configures conservative automatic turn detection', () => {
    expect(buildGeminiLiveConfig('Fenrir')).toMatchObject({
      realtimeInputConfig: {
        automaticActivityDetection: {
          disabled: false,
          prefixPaddingMs: 40,
          silenceDurationMs: 650,
        },
      },
    });
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `bun test src/features/chat/voice-live-config.test.ts`

Expected: FAIL because `voice-live-config.ts` does not exist.

- [ ] **Step 3: Implement strict parsing and config**

Define:

```ts
export type VoiceLiveToken = {
  token: string;
  model: string;
  voiceName: string;
};

export const LEGACY_LIVE_MODEL =
  'gemini-2.5-flash-native-audio-preview-09-2025';
```

Reject a missing/blank token. Accept `live.model` and `live.voice.name` only when each is a non-empty string; otherwise use `LEGACY_LIVE_MODEL` and the supplied catalog voice. `buildGeminiLiveConfig` must include audio modality, the selected prebuilt voice, input/output transcription, the VAD values above, and a concise `systemInstruction` describing short, warm, interruption-aware spoken responses.

- [ ] **Step 4: Verify the focused test**

Run: `bun test src/features/chat/voice-live-config.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the mobile contract**

```bash
git add src/features/chat/voice-live-config.ts src/features/chat/voice-live-config.test.ts
git commit -m "feat(voice): consume authoritative Live session config"
```

---

### Task 3: Upgrade and configure the native full-duplex dependency

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`
- Modify: `app.json:145-150`
- Modify generated native projects through: `npx expo prebuild --clean`
- Create: `src/features/chat/native-voice-runtime-contract.test.ts`

**Interfaces:**
- Produces: `AudioRecorder` support for `{ iosVoiceProcessing: true, androidInputPreset: 'voiceCommunication' }`, plus native microphone permission configuration.

- [ ] **Step 1: Write the failing dependency contract**

The test reads `package.json`, `app.json`, and `node_modules/react-native-audio-api/lib/typescript/core/AudioRecorder.d.ts`. Assert that the dependency major version is at least 1, the plugin is configured with the Memento microphone copy, and the constructor declaration contains `iosVoiceProcessing` and `androidInputPreset`.

- [ ] **Step 2: Run the test and verify RED**

Run: `bun test src/features/chat/native-voice-runtime-contract.test.ts`

Expected: FAIL because the installed dependency is 0.13.x and lacks the constructor options.

- [ ] **Step 3: Upgrade only the required native library**

Run:

```bash
bun add react-native-audio-api@^1.0.0
```

Do not install `react-native-audio-worklets`; this design uses recorder callbacks and the native buffer queue, not custom audio worklets.

- [ ] **Step 4: Configure the Expo plugin**

Replace the string plugin entry with:

```json
[
  "react-native-audio-api",
  {
    "iosMicrophonePermission": "Allow Memento to access your microphone for voice conversations.",
    "androidPermissions": [
      "android.permission.RECORD_AUDIO",
      "android.permission.MODIFY_AUDIO_SETTINGS"
    ]
  }
]
```

Keep the separate `expo-audio` plugin for voice memos and media recording.

- [ ] **Step 5: Regenerate and compile native projects**

Run:

```bash
npx expo prebuild --clean
npx expo run:ios --no-bundler
```

Expected: native build succeeds and the app launches. If the installed 1.x API names differ from the declaration required by the contract test, adjust only the test and later constructor call to the actual typed names that provide iOS voice processing and Android voice-communication capture; do not accept a version without both capabilities.

- [ ] **Step 6: Verify dependency contract and TypeScript**

Run:

```bash
bun test src/features/chat/native-voice-runtime-contract.test.ts
bun run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit the native dependency boundary**

```bash
git add package.json bun.lock app.json ios android src/features/chat/native-voice-runtime-contract.test.ts
git commit -m "build(voice): enable native full-duplex processing"
```

---

### Task 4: Add PCM conversion and privacy-safe session metrics

**Files:**
- Create: `src/features/chat/voice-pcm.ts`
- Create: `src/features/chat/voice-pcm.test.ts`
- Create: `src/features/chat/voice-session-metrics.ts`
- Create: `src/features/chat/voice-session-metrics.test.ts`

**Interfaces:**
- Produces: `float32ToPcm16Base64`, `pcm16Base64ToFloat32`, `VoiceSessionMetrics`, and `VoiceMetricSnapshot`.

- [ ] **Step 1: Write failing PCM edge-case tests**

Test exact byte results for `[-2, -1, -0.5, 0, 0.5, 1, 2]`, confirming clipping and little-endian signed PCM. Test that odd-byte decoded output returns `{ ok: false, reason: 'odd-byte-length' }` rather than constructing an invalid `Int16Array`.

- [ ] **Step 2: Run PCM tests and verify RED**

Run: `bun test src/features/chat/voice-pcm.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement allocation-bounded conversion**

`float32ToPcm16Base64` must clamp each sample to `[-1, 1]`, map negative values with multiplier `0x8000`, positive values with `0x7fff`, write using `DataView.setInt16(offset, value, true)`, and base64-encode in bounded chunks. `pcm16Base64ToFloat32` validates even byte length and divides signed samples by `32768`.

- [ ] **Step 4: Write failing metrics tests**

Use an injected `now(): number` clock. Test connection-to-open, setup, first output, playback start, queue minimum/maximum, underrun count, interruption latency, route changes, and close reason. Assert `JSON.stringify(snapshot)` contains none of `token`, `transcript`, `audio`, or PCM payload fields.

- [ ] **Step 5: Implement metrics as numeric aggregates only**

```ts
export type VoiceMetricSnapshot = {
  connectToOpenMs?: number;
  connectToSetupMs?: number;
  firstOutputToPlaybackMs?: number;
  minQueueDepthMs?: number;
  maxQueueDepthMs?: number;
  underruns: number;
  interruptionToSilenceMs?: number;
  routeChanges: number;
  durationMs: number;
  closeCode?: number;
  closeReason?: string;
};
```

Cap `closeReason` at 120 characters and never accept arbitrary metadata objects.

- [ ] **Step 6: Verify focused tests**

Run:

```bash
bun test src/features/chat/voice-pcm.test.ts
bun test src/features/chat/voice-session-metrics.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit utilities**

```bash
git add src/features/chat/voice-pcm.ts src/features/chat/voice-pcm.test.ts src/features/chat/voice-session-metrics.ts src/features/chat/voice-session-metrics.test.ts
git commit -m "feat(voice): add PCM conversion and session metrics"
```

---

### Task 5: Build the native queued playback controller

**Files:**
- Create: `src/features/chat/voice-playback-controller.ts`
- Create: `src/features/chat/voice-playback-controller.test.ts`
- Create: `src/features/chat/voice-audio-types.ts`

**Interfaces:**
- Produces: `VoicePlaybackController.enqueue(base64)`, `.interrupt(epoch)`, `.finishTurn()`, `.stop()`, and `.getQueueDepthMs()`.
- Consumes: an injected `VoicePlaybackRuntime` that creates, connects, starts, clears, and stops one native queue source.

- [ ] **Step 1: Define the runtime boundary in the failing test**

Use a fake runtime that records `createQueue`, `enqueue`, `start`, `clear`, and `stop`. Inject a fake clock and timer scheduler. Assert 80 ms remains buffered, 120 ms starts immediately, and one 40 ms chunk starts when the 180 ms deadline fires.

- [ ] **Step 2: Add interruption and late-chunk failing cases**

After `interrupt(2)`, assert the old queue is cleared/stopped, a fresh queue exists, and `enqueue(chunk, 1)` is rejected as stale while `enqueue(chunk, 2)` enters the new prebuffer.

- [ ] **Step 3: Add underrun failing case**

After the final queued buffer ends while the model turn is still active, assert the controller records one underrun and returns to prebuffering. A later chunk must not start until the normal threshold/deadline is met.

- [ ] **Step 4: Run the tests and verify RED**

Run: `bun test src/features/chat/voice-playback-controller.test.ts`

Expected: FAIL because the controller does not exist.

- [ ] **Step 5: Implement the finite playback states**

Use only `idle`, `prebuffering`, `playing`, and `stopped`. Track `epoch`, queued milliseconds, active turn, one startup timer, and returned native buffer IDs. Start exactly one queue per epoch. `interrupt`, `stop`, and queue replacement cancel the startup timer before touching native state.

- [ ] **Step 6: Verify all playback cases**

Run: `bun test src/features/chat/voice-playback-controller.test.ts`

Expected: PASS with no timer leaks.

- [ ] **Step 7: Commit playback state**

```bash
git add src/features/chat/voice-audio-types.ts src/features/chat/voice-playback-controller.ts src/features/chat/voice-playback-controller.test.ts
git commit -m "feat(voice): add jitter-buffered playback controller"
```

---

### Task 6: Implement the full-duplex native audio engine

**Files:**
- Create: `src/features/chat/voice-audio-engine.ts`
- Create: `src/features/chat/voice-audio-engine.test.ts`

**Interfaces:**
- Consumes: `VoicePlaybackController`, PCM helpers, and `VoiceSessionMetrics`.
- Produces: `VoiceAudioEngine.start(onInput)`, `.enqueueOutput(base64, epoch)`, `.interruptOutput(epoch)`, `.finishOutputTurn()`, `.stop()`, and `.snapshot()`.

- [ ] **Step 1: Write failing lifecycle tests with injected native adapters**

Assert start order is session options → session active → context resume → recorder callback registration → recorder start. Assert session options include `playAndRecord`, `voiceChat`, `defaultToSpeaker`, and `allowBluetoothHFP`; recorder construction includes iOS voice processing and Android voice communication.

- [ ] **Step 2: Write failing capture tests**

Feed a 1,600-frame mono native `AudioBuffer` through the fake recorder callback. Assert `onInput` receives a 16 kHz PCM16 base64 chunk representing 100 ms. Feed a different native buffer size and assert the actual sample count is encoded without padding or truncation and its duration anomaly is counted.

- [ ] **Step 3: Write failing cleanup tests**

Call `stop()` twice and simulate an app-background or recorder-error path. Assert recorder callback is cleared, recorder stops once, queue stops once, context closes once, and session deactivates once.

- [ ] **Step 4: Run the engine test and verify RED**

Run: `bun test src/features/chat/voice-audio-engine.test.ts`

Expected: FAIL because the engine does not exist.

- [ ] **Step 5: Implement the native adapter**

Create one `AudioRecorder`, one 24 kHz `AudioContext`, and queue sources through `createBufferQueueSource({ pitchCorrection: false })`. Convert output PCM with `context.createBuffer(1, samples.length, 24_000)` and `copyToChannel`. Forward `onBufferEnded` to the playback controller for queue accounting. Do not create `AudioBufferSourceNode` per Gemini chunk.

- [ ] **Step 6: Handle native recorder and route events**

Recorder errors invoke an injected `onFatalError`. Route-change events increment metrics; a route with no valid input invokes the same fatal path. Remove every native event subscription during `stop`.

- [ ] **Step 7: Verify engine, typecheck, and lint**

Run:

```bash
bun test src/features/chat/voice-audio-engine.test.ts
bun run typecheck
bun run lint
```

Expected: PASS.

- [ ] **Step 8: Commit the native engine**

```bash
git add src/features/chat/voice-audio-engine.ts src/features/chat/voice-audio-engine.test.ts
git commit -m "feat(voice): add full-duplex native audio engine"
```

---

### Task 7: Integrate Gemini events, VAD, and opening turn

**Files:**
- Modify: `src/hooks/use-voice-mode.ts`
- Replace assertions in: `src/features/chat/voice-provider-contract.test.ts`
- Create: `src/features/chat/voice-message-handler.ts`
- Create: `src/features/chat/voice-message-handler.test.ts`

**Interfaces:**
- Consumes: `VoiceAudioEngine`, parsed token contract, Gemini configuration, and `LiveServerMessage`.
- Produces: current `useVoiceMode` public state and controls without exposing native audio details.

- [ ] **Step 1: Write failing message-handler tests**

Test a message containing multiple audio parts enqueues every valid part in order. Test `serverContent.interrupted` increments the generation epoch and calls `interruptOutput` before any parts in a later event are accepted. Test `turnComplete` calls `finishOutputTurn`. Test `setupComplete` resolves a one-shot readiness latch.

- [ ] **Step 2: Run message tests and verify RED**

Run: `bun test src/features/chat/voice-message-handler.test.ts`

Expected: FAIL because the handler does not exist.

- [ ] **Step 3: Implement the pure message dispatcher**

The dispatcher returns typed effects rather than mutating React state directly: `setup-complete`, `output-audio`, `input-transcript`, `output-transcript`, `interrupted`, and `turn-complete`. Preserve the order of all parts in one server event.

- [ ] **Step 4: Rewrite the hook contract test before the hook**

Assert the hook imports `VoiceAudioEngine`, does not import `useAudioStream`, `setAudioModeAsync`, or `AudioBufferSourceNode`, uses `parseVoiceLiveToken`, handles `serverContent.interrupted`, and retains `@google/genai/web`.

- [ ] **Step 5: Run hook contract and verify RED**

Run: `bun test src/features/chat/voice-provider-contract.test.ts`

Expected: FAIL on the old mixed audio imports.

- [ ] **Step 6: Replace the hook's audio ownership**

Create the engine only for `connect`, pass captured PCM to `session.sendRealtimeInput({ audio: { data, mimeType: 'audio/pcm;rate=16000' } })`, and pass every output effect to `engine.enqueueOutput`. Remove `nextPlaybackTimeRef`, `playbackSourcesRef`, `playPcmChunk`, `useAudioStream`, and `setAudioModeAsync`.

- [ ] **Step 7: Gate the opening turn on setup and audio readiness**

After `client.live.connect`, start the audio engine, then wait for the one-shot `setupComplete` latch. Send the existing greeting instruction exactly once with `turnComplete: true`. A close/error before readiness rejects the latch and runs idempotent disconnect.

- [ ] **Step 8: Integrate interruption and UI speaking state**

On interruption, clear output immediately and set `isAiSpeaking` false. Set it true on the first accepted output audio chunk, not only when transcription arrives. On `turnComplete`, mark the playback controller's turn complete but leave `isAiSpeaking` true until the native queue reports empty.

- [ ] **Step 9: Verify the focused chat suite**

Run:

```bash
bun test src/features/chat/voice-message-handler.test.ts
bun test src/features/chat/voice-provider-contract.test.ts
bun test src/features/chat
bun run typecheck
bun run lint
```

Expected: PASS.

- [ ] **Step 10: Commit Gemini integration**

```bash
git add src/hooks/use-voice-mode.ts src/features/chat/voice-provider-contract.test.ts src/features/chat/voice-message-handler.ts src/features/chat/voice-message-handler.test.ts
git commit -m "feat(voice): integrate fluid Gemini full-duplex sessions"
```

---

### Task 8: Separate transcript turns and harden app lifecycle

**Files:**
- Create: `src/features/chat/voice-transcript-turns.ts`
- Create: `src/features/chat/voice-transcript-turns.test.ts`
- Modify: `src/hooks/use-voice-mode.ts`
- Modify only if required for route cleanup: `src/components/chat/VoiceCallScreen.tsx`

**Interfaces:**
- Produces: `VoiceTranscriptTurns.appendUser`, `.appendModel`, `.completeTurn`, `.restoreFailedTurn`, and `.drainCompleted`.

- [ ] **Step 1: Write failing transcript tests**

Test incremental user/model fragments combine within one turn, two completed turns remain separate, empty turns are omitted, an interrupted partial model response preserves only received text, and failed persistence restores the exact failed turn without merging it into the active turn.

- [ ] **Step 2: Run transcript tests and verify RED**

Run: `bun test src/features/chat/voice-transcript-turns.test.ts`

Expected: FAIL because the turn accumulator does not exist.

- [ ] **Step 3: Implement the accumulator**

Use an active `{ user: string; ai: string }` and a FIFO completed-turn array. `completeTurn` trims values and queues at most two messages with `is_voice: true`. `drainCompleted` returns and removes complete turns atomically; `restoreFailedTurn` prepends one failed turn.

- [ ] **Step 4: Replace the hook's global transcript strings**

Persist completed turns asynchronously through the existing memory endpoint. Keep pending turns when `memoryId` is absent. Persistence failure restores only the failed batch. Persistence must never be awaited from the Gemini `onmessage` callback.

- [ ] **Step 5: Add lifecycle tests to the hook contract**

Assert an `AppState` background transition calls disconnect, native close callbacks cannot recurse, and foreground does not reconnect automatically. Assert recorder fatal error produces the existing reconnectable `connection-error` state.

- [ ] **Step 6: Verify lifecycle and chat tests**

Run:

```bash
bun test src/features/chat/voice-transcript-turns.test.ts
bun test src/features/chat
bun run typecheck
bun run lint
```

Expected: PASS.

- [ ] **Step 7: Commit transcript and lifecycle hardening**

```bash
git add src/features/chat/voice-transcript-turns.ts src/features/chat/voice-transcript-turns.test.ts src/hooks/use-voice-mode.ts src/components/chat/VoiceCallScreen.tsx
git commit -m "fix(voice): preserve turn boundaries and lifecycle cleanup"
```

---

### Task 9: Deploy development API and perform measured device acceptance

**Files:**
- Create: `docs/testing/fluid-voice-device-checklist.md`
- Modify only files required by verified failures from this task.

**Interfaces:**
- Consumes: all prior tasks.
- Produces: a deployed development token contract and recorded pass/fail measurements for the acceptance criteria.

- [ ] **Step 1: Write the device checklist before deployment**

Include fields for device/OS, route, network, five-minute duration, connect-to-open, setup latency, end-of-speech-to-first-output, first-output-to-playback, underruns, interruption latency, route changes, close reason, audible crackles, stale resumed audio, and natural 400 ms pause behavior. Include speaker, Bluetooth HFP, wired audio when available, Wi-Fi, cellular, background/foreground, and Bluetooth disconnect scenarios.

- [ ] **Step 2: Run full automated mobile verification**

Run:

```bash
bun run lint
bun run typecheck
bun run check:typography
bun test
bun run check:prod
npx expo export --platform ios
```

Expected: every command exits 0.

- [ ] **Step 3: Run full API verification**

Run:

```bash
cd /Users/dev/Workspace/memento/api
bun run compile
bun run lint
bun test
```

Expected: every command exits 0.

- [ ] **Step 4: Deploy API development first**

Set `GEMINI_LIVE_MODEL_VERSION=gemini-3.8-live` in the backend development environment, deploy the verified API commit, restart both API and worker processes with updated environment, and verify `/ai/ephemeral-token` returns `data.live.model === 'gemini-3.8-live'` for an authenticated Pro development account. Never print the token value.

- [ ] **Step 5: Rebuild the local development client**

Run:

```bash
cd /Users/dev/Workspace/memento/mobile
npx expo prebuild --clean
npx expo run:ios
```

Expected: local dev-branch binary launches and connects to the development API.

- [ ] **Step 6: Execute physical-device acceptance**

Run every checklist route and scenario. Require: no repeatable clicks/gaps in a five-minute healthy-network call, P95 end-of-speech-to-audible response below 1.2 seconds, P95 interruption-to-silence below 150 ms, at most one healthy-network underrun per five minutes, no stale audio after interruption, and no turn end during an approximately 400 ms natural pause.

- [ ] **Step 7: Tune only evidence-backed constants**

If measurements fail, change one variable per run: playback prebuffer within 80–240 ms, then VAD silence within 500–800 ms. Record before/after values and results in the checklist. Do not introduce hybrid VAD in this plan.

- [ ] **Step 8: Commit the acceptance record and any proven tuning**

```bash
git add docs/testing/fluid-voice-device-checklist.md src/features/chat src/hooks/use-voice-mode.ts
git commit -m "test(voice): record full-duplex device acceptance"
```

---

## Final Verification Gate

- [ ] Mobile and API working trees contain no unintended generated or unrelated changes.
- [ ] Mobile complete verification and iOS export pass.
- [ ] API compile, lint, and complete test suite pass.
- [ ] Development ephemeral token constrains and returns `gemini-3.8-live`.
- [ ] Physical-device checklist records every route and acceptance metric.
- [ ] No logs contain PCM, transcript text, or ephemeral tokens.
- [ ] Existing IAP entitlement and voice-call UI tests remain green.

