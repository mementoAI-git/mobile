# Memento voice audit — 10 October 2026

Voice quality is currently limited primarily by duplex capture, interruption/session ownership, and evidence quality. The code already has native speech-to-speech, a thoughtful server prompt, memory context, tools, native playback, and session resumption. A model swap alone will not resolve the identified problems.

Scope: working-tree mobile voice implementation, call UI/provider, transcript and tool handling, telemetry, build flags, native C++ playback core, and adjacent `../api` voice configuration/context/search/prompt sources. Existing uncommitted work was included. This is a deep voice-focused audit, not an exhaustive security or correctness audit of every unrelated app feature. API source and build configuration do not prove what is deployed. No production calls, paid model requests, or physical-device measurements were performed. No application code was changed.

## Status update — later on 10 October 2026

Findings were checked against the code; all confirmed except the `prefixPaddingMs` note in finding 7, which is corrected below.

| Finding | Status |
| --- | --- |
| 1. Speakerphone interruption | **In progress.** Root cause of the iOS watchdog freeze found and patched in `patches/react-native-audio-api@…patch` (see finding 1). Enabled only in the `testflight` profile; awaiting physical-iPhone validation. |
| 2. Local interruption resumes old audio | **Fixed.** `VoiceResponseGate` drops the abandoned response until Gemini's turn boundary; local interrupt now uses the server interruption transcript path. |
| 7. Silence detection and buffering | **Partly addressed.** Capture frames reduced from 100 ms to 40 ms. Measured latencies added below. `prefixPaddingMs` semantics are disputed between Google's own sources (see finding 7). |
| 9. Playback state reset per chunk | **Fixed.** Native controller only enters prebuffering from idle. |
| Others | Unchanged. |

### Measured: end of user speech to first model audio

Probe against Gemini Live through an ephemeral token with the app's locked config (recorded TTS speech streamed in real time with a 700 ms mid-thought pause; network from the developer machine; small samples, so treat small differences with caution):

| Model / setting | Median | Notes |
| --- | --- | --- |
| `gemini-2.5-flash-native-audio-preview-09-2025`, 800 ms silence | 3.2 s | 3 runs |
| `gemini-3.8-live`, 800 ms silence | 1.33 s | 8 runs, middle half 1.28–1.57 s |
| `gemini-3.8-live`, 800 ms silence, thinking off | 1.25 s | 8 runs, middle half 1.24–1.33 s; API PR #53 |
| `gemini-3.8-live`, 450 ms silence | 1.6 s | 3 runs; no faster than 800 ms here |

Model choice is the largest measured latency factor (about 2 s). Confirm `GEMINI_LIVE_MODEL_VERSION` on each server. `enableAffectiveDialog` and `proactiveAudio` are rejected by `gemini-3.8-live`. Separately, an API change on 8 October (`lockAdditionalFields: []`) made every token request fail with an invalid field mask; fixed in API PRs #51 and #52.

The scorecard's "p50 below 800 ms" end-of-speech-to-audible target is not reachable while the control arm waits 800 ms of silence before the model starts; it needs semantic endpointing, a shorter window, or a revised target.

## Evidence and validation

- `bun test src/features/chat src/lib/sentry-tracing.test.ts`: 285 pass, 0 fail across 53 files; 854 assertions.
- `bun run test:native-voice`: completed successfully, including de-click, concealment, interruption, and adaptive-buffer checks.
- `bun run typecheck`: completed successfully.
- An isolated call to `VoiceMessageHandler.handle(oldAudioMessage, 2)` labels the old response packet with epoch 2. The message handler has no response/session identity with which to reject it.
- `mergeVoiceTranscript('I went to Lagos', 'I went to Abuja')` produces `I went to Lagos I went to Abuja`.
- The repository's physical-device acceptance sheet remains pending and contains contradictory background lifecycle expectations.

## Architecture that actually runs

1. Call screen configures the app-level provider and prefetches a single-use token.
2. API builds profile/persona context, summaries, recent conversation lines, long-term memory and voice policy. It locks these and the voice/tools/turn settings into the token.
3. Mobile concurrently starts native microphone/playback and requests the token, dynamically loads Gemini, opens a WebSocket, and waits for setup.
4. Native capture supplies mono PCM chunks at 16 kHz (100 ms at the time of the audit; now 40 ms). JavaScript converts/sends them. Gemini returns 24 kHz audio and separate transcripts.
5. Native C++ playback or a JS queue buffers audio. Epochs invalidate queued audio on interruption.
6. Mobile executes tool calls, uploads completed transcript turns, resumes connections, and reports a Sentry transaction on teardown.

The API defaults to `gemini-3.8-live`; an environment override can change it. Mobile still has a legacy fallback model. The alarming English-only mobile prompt is not the authoritative prompt for the normal server-constrained path. Fixing only that client prompt would not change normal server behavior.

## Findings, in priority order

### 1. P0 product blocker: speakerphone cannot support natural interruption with the checked-in production policy

Evidence: `eas.json` production sets `EXPO_PUBLIC_VOICE_FULL_DUPLEX=false`. `src/features/chat/voice-audio-policy.ts` additionally requires explicit iOS voice processing before enabling iOS duplex. Checked-in profiles do not enable that iOS flag. `voice-audio-engine.ts` drops speaker microphone frames while output is audible, with a 200 ms hangover.

Impact: the assistant literally cannot hear a user saying “wait” while it speaks on the speaker route. Headphones have a separate bypass, but initial greeting protection still drops input when duplex is disabled.

Recommendation: repair and validate a stable native duplex/AEC path before enabling production speaker duplex. The policy documents real iOS watchdog freezes in `setVoiceProcessingEnabled`; simply flipping the switch is not an acceptable repair. Evaluate one coordinated capture/render audio session, safe route reconfiguration, and platform echo cancellation. Compare a WebRTC audio-device path with repairing the current audio library. Keep explicit device/route fallbacks until measured.

Status: the freeze was a loop in `react-native-audio-api`. Switching voice processing changes the hardware input format, iOS posts an engine configuration change, and the library's handler rebuilt the whole engine on the main thread. The fresh engine had voice processing off, so it was switched on again, which posted another change, until the watchdog killed the app. The patch ignores configuration changes for one second after our own voice-processing switch and coalesces bursts into one restart. It compiles for iOS and applies cleanly; it has not yet been validated on a device. The `testflight` profile now sets `EXPO_PUBLIC_VOICE_IOS_VOICE_PROCESSING=true`. Production remains off.

Acceptance: physical iPhone and Android speaker calls, multiple volumes, quiet/noisy rooms, Bluetooth changes, lock screen, repeated interruptions, no freezes or self-triggered replies. Acoustic speech-start to actual output silence must be measured externally or from native timestamps.

### 2. P1 confirmed: local interruption only clears playback; later old audio is accepted again

Evidence: `use-voice-mode.ts:1145` increments epoch and clears output, but sends no provider cancellation and establishes no discard-until-boundary state. `handleLiveMessage` tags every received packet with the engine's current epoch. Thus the epoch rejects already-queued work but cannot distinguish a delayed packet from the same old generation. The isolated handler reproduction confirms the labeling behavior.

Impact: tapping interrupt can briefly silence the assistant and then allow it to resume. Local interruption also completes the transcript without marking/syncing it through the same interrupted-turn path used for server interruptions.

Status: fixed. `src/features/chat/voice-response-gate.ts` drops model audio and output transcripts after a local interrupt until Gemini's `turnComplete` or server `interrupted`; a tap after the response finished discards nothing. Local interrupt now follows the server path (`handleInterruption`, `completeTurn`, `syncCompletedTurns(true)`). The gate resets per call and after reconnect. Remaining from this finding: tool cancellation policy.

Recommendation: one interruption operation must own local silence, provider-supported cancellation/turn signaling, rejection of residual output, tool cancellation policy, transcript completion, and telemetry. Preserve a boundary between the abandoned response and the next response. Test tap interruption with delayed old packets before and after server interruption/turn-complete events. Do not assume any provider cancellation event exists without verifying that provider's protocol.

### 3. P1: socket callbacks and asynchronous tool results lack session-generation ownership

Evidence: `openLiveSession` gives every socket the same `onmessage: handleLiveMessage`. Reconnect opens a replacement before closing the previous socket. Only close handling checks socket identity. Tool response callbacks send through mutable `sessionRef.current`.

Impact: old socket messages can affect new playback/transcript/setup state. A slow tool operation can finish after hangup and send into a later call. These are code-supported race risks; no live overlapping-socket reproduction was performed.

Recommendation: introduce call generation and transport generation IDs. Ignore obsolete callbacks, scope setup completion to its own attempt, and bind tool results to their originating session. Give the relay an explicit dispose/abort lifecycle. Test hangup/new-call during search, old setup completion, and old transcript/audio during reconnect.

### 4. P1: setup and recovery have no bounded overall deadline

Evidence: `use-voice-mode.ts:736` awaits `setupReady.promise` without a timer. The reconnect delay array totals ten seconds, but each token HTTP request can take 30 seconds and each setup wait can be unbounded. Go-away and network-change callers discard reconnect's false result. There is no exposed reconnecting state.

Impact: a call can appear connected or connecting while it is unusable. The ten-second comment does not describe the actual worst-case recovery duration.

Recommendation: explicit state machine (`idle`, `connecting`, `listening`, `speaking`, `reconnecting`, `ending`, `failed`), per-step and overall deadlines, cancellation, and terminal handling for all reconnect entry points. Preserve close code/reason. Add a silence/liveness diagnostic that distinguishes ordinary conversational quiet from a dead transport. When resume is rejected, either restart with a bounded trusted context snapshot or clearly end the call; never silently reset the conversation.

### 5. P1: transcript saves can be lost permanently after failed teardown retries

Evidence: `VoiceTurnSync` stores pending messages only in memory. Disconnect detaches the sync object, flushes, retries once, then logs failure. The call-end request is fire-and-forget and only runs after successful transcript persistence.

Impact: a network outage at hangup or process termination can lose personal history or leave call metadata unfinished.

Recommendation: durable local outbox for completed turns and call-end events, keyed by user/call/turn index, with server idempotency and restart recovery. Keep retryable pending state until acknowledged. Define retention/cleanup for personal transcripts and isolate accounts. Test offline hangup, process restart, duplicate retry, and partial batch success.

### 6. P1: transcript correction and audible-history accounting are incomplete

Evidence: the transcript merger cannot distinguish corrected snapshots from deltas; the Lagos/Abuja reproduction duplicates conflicting versions. `VoiceTranscriptTurns` stores all received model transcription, without tracking which queued audio was actually heard. The output queue allows up to five seconds.

Impact: saved history can contain contradictions or assistant words never heard by the user. Future conversations can then refer to something the assistant never audibly said.

Recommendation: model-specific transcript semantics, stable turn IDs, explicit interim/final handling, and interruption metadata. Track rendered sample counts and use alignment when the provider supplies it. Without alignment, preserve uncertainty rather than pretending to know a precise spoken-text cutoff. Test delayed final transcripts and back-to-back user turns across the 600 ms settle window.

### 7. P1 quality/latency tradeoff: fixed silence detection plus buffering consumes most of the response budget

Evidence: server control arm is 800 ms silence; fast arm is 450 ms, with zero rollout by default. Native startup buffer is 240 ms; recovery is 360 ms and adaptive extra buffering can reach 360 ms. Capture batches were 100 ms (now 40 ms). On `prefixPaddingMs`, Google's sources disagree: the `@google/genai` SDK type docs say "the required duration of detected speech before start-of-speech is committed" (matching the server comment), while the Live API capabilities guide says "the amount of audio to include before speech is detected". Treat its effect as unverified and measure it before tuning. (An earlier note here said the server comment was settled; that was wrong.)

Impact: an 800 ms endpoint window plus roughly 240 ms priming leaves little margin under the documented 1,200 ms audible response target. This is a budget illustration, not a measured end-to-end sum: stages can overlap and short-turn flushing can change priming behavior.

Recommendation: measure each stage, then tune per route/network. Distinguish “I'm done” from a thinking pause and distinguish a backchannel (“mm-hmm”) from a correction (“no, wait”). Compare semantic endpointing in a provider experiment. Do not shorten every pause globally or replace AEC with an energy threshold. The standalone `voice-vad.ts` is currently unused by the call path and is not an implemented interruption solution.

### 8. P1 observability: existing numbers cannot establish conversational quality

Evidence: `voice-latency.ts` estimates speech end from fixed RMS ≥0.02 on delivered frames. Quiet speech may be omitted; background energy can move the timestamp. Early server interruption is labeled a cutoff even when the user intentionally changes topic. Speaker gating prevents observing attempted interruptions. Interruption-to-silence metrics mark the clear command rather than hardware silence. Voice telemetry is emitted at teardown, so app kills can omit the call report.

Recommendation: label proxy metrics honestly. Add native capture/render timestamps, call/transport generation, duplex/AEC policy, prompt version, tool latency/outcome, recovery duration, lost-input duration, and per-turn events. Measure attempted versus successful interruption in controlled recorded evaluations. Report aggregate percentiles from individual turns rather than percentiles of per-call medians. Emit bounded lifecycle milestones so failures before teardown remain visible.

`sentry-tracing.ts` correctly restricts propagation to the configured API origin. It is not the main quality bottleneck.

### 9. P2 confirmed: native playback state is reset to prebuffering on every chunk

Evidence: `NativeVoicePlaybackController.enqueue` unconditionally calls `setState('prebuffering')`; the 50 ms poll restores `playing`. The hook maps those callbacks to `isAiSpeaking` and then sets it true on accepted output.

Impact: unnecessary state transitions, repeated playback-start notifications and possible UI/native activity churn. Actual rendering remains controlled by native state; audible stutter is not established by this finding.

Status: fixed. `enqueue` only enters prebuffering from idle; a test covers chunks arriving while playing.

Recommendation: treat native render state as authoritative. Enter prebuffering only on genuine priming/recovery and emit first-playback once per response. Verify stream state transitions behaviorally.

### 10. P2: greeting, mute and paused-stream behavior need protocol-level handling

Evidence: greeting shielding drops microphone data while the greeting starts; safety release is 4.5 seconds. `setMuted` and `toggleMute` stop sending frames without `audioStreamEnd`; no such event exists in the audited path.

Impact: the assistant can miss “actually, I need…” at call start. Muting mid-utterance can leave provider-side audio pending, depending on provider behavior.

Recommendation: once duplex is safe, allow the user to speak first and interrupt greeting. Send the documented audio-stream end signal for deliberate prolonged microphone pauses, with idempotent state transitions and tests. Do not send it on every short capture gap.

### 11. P2 intelligence: memory search has limited relevance and weak provenance

Evidence: server fallback search OR-matches the first six words across title/summary/topics, sorts by update time, and returns five results. It does not search user body text in that fallback. Supermemory runs alongside it, but failures/timeouts collapse into empty results. Response is a 1,500-character string with summaries and no structured source IDs. Displayed dates use record creation time, not necessarily event time.

Impact: common words can retrieve recent irrelevant memories. Retrieval unavailability can sound like no memory exists. Summaries and creation dates can be mistaken for first-hand evidence or event dates.

Recommendation: hybrid lexical/semantic retrieval, entity and temporal constraints, relevance ranking, user-authored excerpts, source IDs and separate event/record dates. Return structured `found`, `no_match`, `unavailable` outcomes. Distinguish explicit facts from inference. Add read-only fact detail retrieval before answering uncertain personal questions.

### 12. P2 intelligence: tool capability limits factual usefulness

Evidence: registered tools are memory search, end call, microphone mute, and navigation. There is no web research tool in this voice configuration and no tool that saves/edits a specific memory on request.

Impact: prompt changes cannot supply current information or execute unsupported tasks. The assistant can be conversationally capable while still failing users' practical requests.

Recommendation: add tools based on Memento use cases: search/read memory, draft/save a memory, corrections, and optionally current web information with sources shown in the transcript. Use server authorization and explicit confirmation appropriate to consequential writes. Keep slow research asynchronous where supported, cancel obsolete work, and never claim success before acknowledgment.

### 13. P2: context preparation can be slow and prefetched context can become stale

Evidence: voice context limits Supermemory to 1.5 seconds, but base context preparation awaits several database/context operations serially without the same overall budget. Recent history is 20 lines capped at 600 characters each. Token prefetch remains valid for three minutes and is keyed by user/conversation/voice, not conversation revision. Server locks context into the token.

Recommendation: parallelize independent reads, impose a total context budget, cache stable profile data, and prioritize active user intent/recent turns over broad enrichment. Invalidate prefetch when conversation/profile/voice revision changes. Resolve the requested voice atomically with token creation; currently mobile's voice name is a cache key/fallback while server uses the stored profile preference. Treat the latter as a race risk to verify around preference persistence, not a confirmed wrong-voice bug.

### 14. P2: tool execution needs deadlines and cancellation beyond response filtering

Evidence: relay waits on `Promise.all`; cancellation only suppresses sending a response. It does not abort a search or reverse an already-run action. HTTP allows 30 seconds. Backend memory lookup has a timeout on Supermemory but not the entire operation.

Recommendation: bounded tool deadlines, separate responses where protocol permits, cancellation tokens, per-call deduplication and outcome tracking. Be explicit that cancelling a response cannot undo a completed action. Current read/navigation/mute actions are limited in scope; fix lifecycle semantics before introducing more consequential writes.

### 15. P2: tests do not yet prove orchestration or acoustic quality

Evidence: useful pure-function and native tests exist, but several provider contract tests assert source-code substrings. The pending device sheet expects both background termination and background continuation.

Recommendation: retain useful unit/native tests and add a fake provider/clock/native runtime exercising the whole call lifecycle. Cover setup timeout, hangup during each await, repeated connect, delayed old messages, partial tool completion, route changes, resume rejection and offline persistence. Update one authoritative acceptance sheet and populate it with release-build physical-device evidence.

## What to keep

- Native speech-to-speech instead of adding an unnecessary serial STT → LLM → TTS pipeline.
- Server-owned token constraints and owned-memory checks.
- Existing concise voice policy: one question at most, often none, no forced reflection or repeated paraphrase.
- Native C++ buffering, de-clicking, epoch rejection of already-enqueued stale audio and adaptive recovery, subject to real-device validation.
- Session resumption/context compression, per-turn persistence, lazy SDK loading and parallel startup.
- Privacy-conscious metadata rather than routine raw audio/transcript logging.

## Delivery sequence

1. **Correctness and measurement:** unify call/transport/response ownership, fix interruption, setup deadlines, state transitions, paused-stream handling and durable persistence. Add behavioral race tests and truthful metrics.
2. **Native duplex:** reproduce the iOS watchdog failure, repair the audio lifecycle, compare native/WebRTC capture options, then enable AEC/duplex only for validated routes. This is the critical path to natural speakerphone conversation.
3. **Turn-taking:** benchmark pause tolerance, backchannels, interruption stop time, acoustic false positives and latency. Tune endpointing and buffering independently. Add semantic endpointing as an experiment if it improves measured outcomes.
4. **Intelligence:** improve grounded memory retrieval and context freshness; add a small set of useful tools with cancellation, deadlines and source attribution. Keep the good existing prompt and evaluate targeted changes.
5. **Provider comparison:** same prompt intent, memory/tool access, devices and scenario set; blind-listen to Gemini versus OpenAI Realtime and score quality, latency, reliability and cost per successful minute. A public API does not establish ChatGPT or Perplexity product parity.

Suggested responsibility split: mobile/native owns audio and lifecycle; API owns context/retrieval/tool contracts; product/QA owns conversational scenarios and blind listening. Do not choose a provider solely from a short quiet-room demo.

## Release quality scorecard

These are proposed engineering targets, not measured results or competitor benchmarks.

| Dimension | Initial gate |
| --- | --- |
| Tap to audible greeting | p95 below 2 seconds on healthy network; distinguish cold/warm start |
| End of speech to audible ordinary reply | p50 below 800 ms, p95 below 1,200 ms |
| Intentional interruption to acoustic silence | p95 below 150–200 ms on validated duplex routes |
| Old response returning after interruption | Zero in deterministic race suite and device acceptance runs |
| False interruptions | At most 1 per 10 minutes in defined noise scenarios |
| Playback underruns | At most 1 per 5 healthy-network minutes; also rate audible defects |
| Conversation durability | No acknowledged completed turns lost across offline hangup/restart |
| Personal-fact grounding | Every asserted personal fact supported by supplied source/context |
| Tool reliability | Deadline, explicit outcome and no stale-session result delivery |
| Recovery | Bounded recovery, visible state, no duplicate greeting or silent context reset |

Build an initial 60–100 scenario corpus with real consenting speakers: Nigerian and other English accents, soft voices, rapid speech, long reflective pauses, corrections, mixed-language names, overlapping speech, nearby TV, fan/traffic noise, headphones and speakerphone, tool delays, and cellular transitions. Include long calls and accessibility needs. Score latency and errors automatically where possible, plus blind human ratings for warmth, comprehension, helpfulness, repetition and interruption appropriateness. Keep identical scenarios for provider/prompt comparisons.

## Official references checked

- [Google Live capabilities](https://ai.google.dev/gemini-api/docs/live-api/capabilities): native audio formats, interruption handling, paused audio signaling and current tool capabilities. These support protocol recommendations, not claims about observed app behavior.
- [Google session management](https://ai.google.dev/gemini-api/docs/live-api/session-management): resumption and context compression.
- [OpenAI VAD](https://developers.openai.com/api/docs/guides/realtime-vad): semantic endpointing distinguishes completed utterances from trailing speech. This is a candidate for comparative evaluation, not evidence that switching vendors fixes mobile audio.

The next implementation milestone should be: a speakerphone call that hears interruptions reliably, never resumes cancelled speech, survives a network transition, and retains completed history. That will improve perceived intelligence more reliably than adding more prompt instructions.
