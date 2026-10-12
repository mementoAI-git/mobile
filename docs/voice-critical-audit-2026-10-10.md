# Critical voice audit — 10 October 2026

## Assessment

The current voice implementation has release-blocking lifecycle and data-integrity defects. Its main weakness is ownership of asynchronous work: route changes, sockets, tools, transcript settlement and archival can outlive the state that created them. Acoustic workarounds also discard input without demonstrating that it is echo. Passing unit tests currently overstate confidence in end-to-end behavior.

Scope: current working-tree mobile voice UI, orchestration, native capture/playback adapter, C++ playback, iOS patch/readback, API capability/configuration, transcript persistence/cleanup and memory search. This is not a claim to have found every possible bug. Production settings, device acoustics, iOS patch behavior and database failure scenarios were not tested live. No application code was changed.

Labels below distinguish **reproduced** using real helpers/engine with fake native adapters, **confirmed source behavior**, and **risk requiring integration/device validation**. Synthetic audio establishes gating behavior, not real-speaker performance.

## Highest-priority findings

### 1. P1 — Route work can resurrect playback after hangup [reproduced]

`src/features/chat/voice-audio-engine.ts:577`, `:642`.

`stop()` removes subscriptions but does not cancel or drain an already-running route change. `handleRouteChange` awaits route queries and can subsequently call `rebuildPlayback` after stop has released everything. The rebuild has no stopped/generation guard.

Probe: pause `isHeadphonesConnected()` during a route change, finish `engine.stop()`, then release the route query. Observed after stop:

```text
session.sampleRate:44100
context.create:44100
context.resume
context.createQueue
queue.connect
```

Impact: audio resources are recreated after hangup. The cached stop promise means another stop does not perform a fresh cleanup. This reproduction does not prove microphone capture restarts, but it proves playback context resurrection.

Fix direction: terminal engine generation/state checked after each awaited native operation; route work must be canceled or reconciled during stop; close newly-created stale resources. Regression test should assert no context creation/resume after completed stop.

### 2. P1 — A recorder-stop failure skips the rest of audio teardown [reproduced]

`src/features/chat/voice-audio-engine.ts:660`.

Teardown awaits recorder stop before stopping playback, closing context and deactivating the audio session. A rejection aborts that sequence. The native adapter explicitly throws when recorder stop reports an error, so this is a supported failure path. The rejected promise is cached.

Probe: recorder stop throws. Observed calls to playback stop, context close and session deactivation: **none**. The hook catches/logs the rejection and proceeds with hangup UI.

Impact: the app can report an ended call with native resources still active. Actual continuing playback/capture depends on the native failure, but cleanup is definitely skipped.

Fix direction: independently attempt every cleanup operation, aggregate/report errors, guarantee final state, and avoid making an incomplete cleanup permanently non-retryable. Test each native cleanup stage failing independently.

### 3. P1 — Memory-search capability contract disables the tool [reproduced]

`src/hooks/use-voice-mode.ts:97`; `src/features/chat/voice-tool-relay.ts:1`; `../api/src/module/api/ai/controller.ts:149`.

Mobile advertises `search_memories`; API checks `memory_search`. The URL builder performs no translation. Running the actual mobile builder/constants through the API predicate produces `memoryToolEnabled: false`.

Impact: these source versions together omit on-demand memory search and its guidance from the constrained token. Startup memory context does not compensate when the user asks about something outside it.

Fix direction: separate capability identifiers from tool function names and test actual serialized mobile request → controller capability parsing → locked token tools. Do not merely modify a fixture that already uses the correct string.

### 4. P1 — A new user utterance can be attached to the previous turn [reproduced]

`src/features/chat/voice-transcript-turns.ts:70`.

When a turn is pending and there is no active interim/final user text, any final input fragment is assumed to belong to the pending turn. A new short utterance can arrive without an interim event during the 600 ms settlement interval.

Probe: user “First question”; model “First answer”; `beginTurnCompletion()`; user “Second question”; settle. Saved result:

```text
user: First question Second question
ai: First answer
```

Impact: chronology and turn association are corrupted. Later summarization/retrieval can treat the answer as applying to the wrong request.

Fix direction: provider-specific event/turn attribution rather than elapsed-time heuristics alone. Test new finals without interim events, delayed prior finals, and new output while prior output transcription settles. The code must acknowledge ambiguity when the provider lacks explicit IDs.

### 5. P1 — “Echo suppression” cannot distinguish echo from quiet speech [behavior reproduced; acoustic impact unmeasured]

`src/features/chat/voice-audio-engine.ts:418`; `src/features/chat/voice-pcm.ts`.

During speaker playback the new filter only passes audio above fixed RMS/peak thresholds. It has no reference to rendered audio, echo correlation, or speech classifier. A trigger opens the filter for 1.5 seconds; the hold is not continuously extended while within the window.

Engine probe: a 220 Hz synthetic signal with RMS 0.02834 becomes delivered RMS **0** during playback. A constant 0.1 signal passes `isBargeInSpeech`. These show amplitude discrimination, not speech/echo discrimination.

Impact risk: soft users, distant microphones and quiet leading syllables can be erased; loud residual echo/noise can open the gate for 1.5 seconds. No pre-roll restores discarded onset. Counter `bargeIns` records a threshold opening, not a verified user interruption. Tests using flat constant arrays cannot validate actual speech detection.

Fix direction: validate native AEC first, then evaluate residual suppression using real recorded double-talk and a playback reference. If using a gate, retain pre-roll, use calibrated hysteresis and measure quiet-speaker false rejection. Do not market this as unrestricted full duplex based on a flag.

### 6. P1 — External loudspeakers are classified as headphones [reproduced]

`src/features/chat/voice-audio-engine.ts:43`, adapter at `:793`.

`isHeadphonesRoute` classifies all Bluetooth, AirPlay, USB and line-out outputs as headphones. Probe with `BluetoothA2DPOutput` named “Living room speaker” returns true. This is the actual classifier used by the adapter, and headphone status bypasses both speaker gating and residual suppression.

Impact risk: Bluetooth speakers/car audio can receive unrestricted uplink despite audible echo. Headphone attachment is being confused with an acoustically isolated output.

Fix direction: model route type and acoustic policy separately. Do not infer isolation from transport alone. Validate external speaker/car routes; use a conservative unknown-route policy where device capabilities cannot establish safety.

### 7. P1 — Session callbacks and tool completions can act on a newer call [source-supported race]

`src/hooks/use-voice-mode.ts:733`, `:1040`; `voice-tool-relay.ts`.

All sockets use the same message handler, which reads current refs. Setup-complete resolves the current setup promise rather than a closure-owned attempt. Reconnect overlaps old/new connections; close handling checks identity but message handling does not. Tool replies target mutable `sessionRef.current`. Clearing `toolRelayRef` does not stop the old relay's async work.

Impact: old audio/transcripts/control messages and late tool results may affect a replacement connection or later call. There is no live socket-race reproduction in this audit.

Fix direction: immutable call/transport generation on callbacks and tool jobs; closure-owned setup completion; explicit disposal/abort; reject late work. Add scripted old-socket event and slow-tool/new-call tests.

### 8. P1 — Setup/reconnect can remain stuck or silently unusable [confirmed source behavior]

`src/hooks/use-voice-mode.ts:751`, `:434`, `:1121`.

Setup waits without a deadline. Ten seconds of retry delays excludes each 30-second HTTP request and unbounded setup wait. Network/go-away callers ignore false reconnect results. While reconnecting, a close callback returns early, so the failure can be lost if the initiator also ignores the result. `onclose` discards code/reason. No reconnecting UI state is exposed.

Fix direction: overall deadline plus stage deadlines, one recovery owner, explicit success/failure transition, close reason retention and cancellable attempts. Test recovery failure without an additional socket event. A setup-complete-only health definition is insufficient.

### 9. P1 — Transcript persistence is not durable across outage/process death [confirmed source behavior]

`voice-turn-sync.ts:23`; `use-voice-mode.ts:620`.

Pending turns exist only in RAM. Hangup detaches the synchronizer, flushes and retries once, then logs failure. Call-end is fire-and-forget after successful transcript save. The app's general offline queue is not integrated with this path.

Impact: valuable personal history and call metadata can be lost. Server idempotent indexes help retries but cannot recover a lost client queue.

Fix direction: account-scoped durable outbox for turns and call-end, retained until acknowledgment, with restart recovery and existing stable indexes. Disconnect UX must not depend on waiting through archival timeouts.

### 10. P1 — Cleanup can turn a model misunderstanding into remembered fact [confirmed logic; bad correction frequency unknown]

`../api/src/module/api/ai/voice/transcript-cleanup.ts`.

Cleanup uses the assistant's next reply as evidence for the user's intended words. `guardCleanupFix` accepts a correction sharing any content word with the original, including changes to entities, dates or negation. Cleaned text feeds insights. Non-English speech can be replaced with `[unclear]`. Raw text is retained, but downstream fact consumers receive the changed text.

Fix direction: separate raw transcript, suggested correction and confirmed facts. Material edits need acoustic evidence or user confirmation. Never use the assistant's interpretation alone as evidence of user intent. Preserve intentional names/code-switching. Test factual precision of changes, not just word overlap/JSON shape.

### 11. P1/P2 — Insight queue failures can permanently drop voice learning [confirmed failure ordering]

`../api/src/module/api/ai/voice/transcript-cleanup.ts:234`.

The call is marked `done` and `queue_insights: false` before `queueInsights` executes. Individual enqueue failures are caught and only logged. A crash between those operations or a queue outage leaves no pending flag for normal retry.

Impact: transcript appears clean/saved but personal-context enrichment silently never happens.

Fix direction: durable transactional outbox or per-item delivery status, idempotent enqueue and acknowledgment after delivery. Cleanup status and enrichment status should be independent.

## Other actionable issues

### 12. Production duplex differs materially from TestFlight [confirmed configuration]

`eas.json` production sets full duplex false; TestFlight enables iOS processing and duplex. A positive TestFlight experience does not establish production behavior. Native readback is now implemented and can disable duplex on explicit failure, which is a real improvement. However, `undefined` readback keeps requested policy, and one false read permanently latches `voiceProcessingUnavailable` for the engine. Route events can occur before native rebuilding finishes, so timing and recovery need testing. The iOS one-second notification suppression patch still needs device validation for real route changes inside the window and self-generated notifications outside it.

### 13. Transcript correction and heard-history accounting remain inaccurate [reproduced/source]

`mergeVoiceTranscript('I went to Lagos', 'I went to Abuja')` returns `I went to Lagos I went to Abuja`. Received model text is not aligned with rendered audio, so saved output can contain words the user never heard. Late text after an interrupted turn boundary can enter the newly active transcript because the discard gate has reopened. Correct snapshot/delta semantics and interruption metadata before using these transcripts as facts.

### 14. Permission denial leaves the screen's state machine incomplete [source]

The hook returns after denial with `isConnecting=false`, but leaves session-active bookkeeping true and supplies neither connected nor connectionFailure. The route changed its own stage to `connecting` before calling the hook and listens for those two outcomes. A permission alert is shown, but the screen can remain in connecting state. Return a typed denied/cancelled outcome and transition both layers consistently. Validate denial, permanent denial, settings return, and hangup during the permission prompt.

### 15. Voice selection is improved, but failure and stale-prefetch paths still disagree with the UI [source]

The initial picker and call settings now await server profile save before local save. Do not report the old missing-profile-write defect as still unchanged. However, `startCall` explicitly proceeds when synchronization fails, using the server voice while displaying the selected voice. The ready-stage effect can overwrite a remotely changed profile preference with an older local one. Token keys include voice name but no profile/conversation revision, so an older token can retain stale context/voice after changes. Use an explicit authoritative selection and invalidate token cache on acknowledged changes.

### 16. Mute/paused audio does not send protocol pause signaling [source]

Mute stops frames but no `audioStreamEnd` is sent. Google documents it for prolonged pauses to flush cached audio. Integrate input open/paused/resumed state rather than treating mute as frame-dropping alone. Greeting gating can discard immediate user input for up to 4.5 seconds on non-duplex policy; make greeting interruptible after the acoustic path is safe.

### 17. Tools have weak cancellation, deadlines and validation [source]

Relay waits for all calls in a batch; one slow call delays all responses. Cancellation only filters final responses and does not prevent already-running actions. Call-action arguments are weakly validated: missing `muted` mutes, and missing/invalid `keep_talking` takes the wrap-up branch. These are model-originated control actions, so validate required booleans strictly and return errors rather than defaulting to significant actions. Scope/deduplicate actions by call and tool-call ID. Current tools are limited; strengthen this before adding writes.

### 18. Playback overflow silently loses words [source; real incidence unknown]

Native `pushPCM`/`publishBlock` and JS queues drop output at buffer limits. The hook only checks an enqueue boolean for speaking state; it does not report an incomplete spoken response. Native overflow/drop counters are not fully exposed in the call report. Transcript can still preserve the whole response. Treat queue overflow as a defined quality failure, surface metrics, and establish a recovery policy. Do not expand buffers indefinitely to hide it.

### 19. Route rebuilding discards queued speech [source]

`rebuildPlayback` stops and replaces playback when sample rate changes, without preserving or explicitly abandoning the current response. Audio arriving while playback is undefined is rejected. Result can be a missing middle of a sentence. Define whether route change resumes, restarts, or abandons the response and keep transcript/metrics consistent.

### 20. Background-call availability is optimistic [source-supported risk]

Android notification startup failures are swallowed while the call remains active, and there is no user-visible degraded-background state. Async show/hide operations are not serialized, so delayed show completion around hangup also needs testing. iOS background timers and JS lifecycle need real-device measurement; counting seconds with a JS interval is not a reliable wall-clock duration under suspension/stalls. Store timestamps and validate locked-screen operation, incoming calls and audio interruptions.

### 21. Retrieval confuses unavailable with absent and favors recency over relevance [source]

Fallback memory search OR-matches six words across title/summary/topics and takes five newest-updated matches. It does not search body there. Errors/timeouts become empty results; no-match text says nothing is saved. Results are truncated plain text, use creation dates and lack structured source IDs. Fix capability wiring first, then return grounded excerpts, relevance scores/source IDs and distinct failure/no-match outcomes. Startup context preparation also lacks one overall budget; token prefetch holds locked context for three minutes without conversation revision.

### 22. Measurements cannot establish naturalness or true interruption latency [source]

RMS-based speech-end estimation ignores quiet speech and is altered by synthetic silence from the new filter. Early interruptions are counted as cutoffs even when intentional. Native silence timing records a clear command rather than acoustic stop; playback state is polled every 50 ms. Teardown-only reporting misses crashes. One per-call percentile is not a population latency distribution. Add per-turn native capture/render timing, attempted interruption labels, overflow and persistence outcomes, and abandoned-start events. A model tuning decision based solely on these current proxies is unsafe.

### 23. API persistence is only partly idempotent [source-supported failure risk]

Turn inserts use unique indexes, but message-count increments happen afterward. A crash after inserts and before the count update causes retry to see only duplicates and not repair the count. Conversation creation without an explicit memory ID uses find-then-create and needs concurrent retry verification. End-call retry updates `ended_at` to retry time. These do not prove transcript loss, but metadata can diverge. Use reconciliation or atomic/idempotent accounting and stable client event time where appropriate.

## What is no longer a valid unchanged finding

- Late transcript no longer reopens `VoiceResponseGate`: it now uses `acceptTranscript()` separately.
- Native playback no longer resets to prebuffering for every received chunk.
- Voice choice now has server-first persistence in the initial picker and call settings.
- iOS actual voice-processing readback now exists, with fallback on explicit failure.
- Capture frames are 40 ms, not 100 ms.

These improvements do not remove the remaining issues above; they should be retained and covered by integration tests.

## Verification and limitations

- `bun test src/features/chat src/lib/sentry-tracing.test.ts`: **305 pass, 0 fail**, 912 assertions across 55 files.
- `bun run test:native-voice`: passed.
- `bun run typecheck`: passed.
- Temporary probes reused the existing fake native adapters against the real engine and independently demonstrated post-stop context creation, incomplete teardown after recorder failure, and amplitude gating to silence.
- Pure-helper probes demonstrated capability mismatch, external-speaker headphone classification, transcript correction concatenation and new-turn misattribution.
- No paid/live provider calls, production traffic, iOS build or acoustic device measurements were performed. C++ tests do not exercise Objective-C engine restart behavior or echo cancellation. API/database/queue failure cases above are source-supported, not injected into a live database.
- Several existing tests assert source substrings or constant-valued sample arrays. They pass without proving real network ordering, speech intelligibility or route lifecycle. The physical-device checklist remains incomplete.

## Release order

1. Block audio resurrection and guarantee best-effort teardown; add failing lifecycle tests first.
2. Correct memory capability wiring; test the actual mobile-to-controller contract.
3. Establish call/transport ownership, setup deadlines and recovery terminal states.
4. Repair turn attribution, durable archival and safe correction/enrichment semantics.
5. Validate AEC, route classification and quiet-user interruption with recorded double-talk. Keep production rollout gated on these results.
6. Fix permission/settings degradation, tool validation and truthful telemetry.

For release acceptance, require no resources created after stopped, cleanup attempts for every native component even on error, no wrong-session callbacks, no completed turn lost across restart, no unsupported fact rewritten into memory, and real-device speaker interruption across soft/normal/loud speech. Measure healthy-network audible response and acoustic interruption p95; do not substitute unit-test duration or JS clear-command timestamps.

Protocol reference checked: [Google Live capabilities](https://ai.google.dev/gemini-api/docs/live-api/capabilities). It documents continuous input, pause signaling and server interruption behavior. It does not establish that the app's native audio or local interruption implementation is correct.
