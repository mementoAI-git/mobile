# Current voice implementation review — 10 October 2026

## Conclusion

Memento has a credible speech-to-speech foundation, but product parity requires fixing client/server contracts, duplex capture, turn/session ownership, and grounded memory. There are concrete defects that make the system appear less intelligent than its model. Start with those before switching providers or adding prompt instructions.

This review independently inspected the current working tree, including uncommitted response-gate, 40 ms capture, native playback, telemetry and iOS patch work. It covers the mobile voice path and adjacent `../api` voice services. It is not a security/correctness certification of unrelated app features. No app code was changed, live provider requests made, or physical-device calls measured.

The existing `voice-audit-2026-10-10.md` contains historical findings and subsequently recorded probe results. Those probe results were not reproduced in this review. This document describes the source inspected now; actual deployed configuration remains unverified.

## Verified current foundations

- API default model: `gemini-3.8-live`, overridable by environment.
- Server token constrains prompt, voice, tools and turn settings. Mobile fallback instructions are not the authority for this normal path.
- Native capture: 640 samples at 16 kHz, or 40 ms per frame. Output: 24 kHz PCM.
- Server silence detection: 800 ms control arm; 450 ms experimental arm; default experiment percentage zero.
- Native playback: 240 ms startup and 360 ms recovery buffering, with adaptive extra buffering. JS fallback remains available.
- A response gate now suppresses audio/transcript from a locally abandoned response until a server boundary.
- Native controller no longer changes playing to prebuffering for each chunk.
- TestFlight enables iOS voice processing and full duplex. Production explicitly disables full duplex.
- Voice prompt already promotes brief natural speech, at most one question, no forced recap, and following the user's intent.
- Session resumption, compression, memory ownership checks, server turn indexes and privacy-conscious telemetry are already present.

## Findings

### 1. High — memory retrieval is disabled by a capability-name mismatch

Evidence:

- `src/hooks/use-voice-mode.ts:97`: capabilities include `SEARCH_MEMORIES_TOOL`.
- `src/features/chat/voice-tool-relay.ts:1`: that value is `search_memories`.
- `src/features/chat/voice-token-url.ts`: transmits capabilities without translation.
- `../api/src/module/api/ai/controller.ts:149`: enables retrieval only for `memory_search`.
- `../api/src/module/api/ai/service.ts`: omitted capability disables the locked tool and its prompt guidance.

Reproduction using the real URL builder and mobile tool constant: sent capabilities are `[search_memories, call_actions]`; the API predicate `includes('memory_search')` returns false.

Impact: these source versions together retain startup context but cannot perform on-demand memory retrieval. This is a direct explanation for apparent forgetfulness. Existing tests use `memory_search` as a fixture or invoke the service with `memoryTool: true`, bypassing the actual client/controller contract.

Recommendation: separate capability identifiers from function names, version/share the contract, and test mobile serialization through API capability parsing to the issued tool list. Verify the token response advertises `search_memories` and an actual voice call invokes it.

### 2. High — initial voice selection does not determine the server-locked voice

Evidence: `app/voice-call.tsx:136` invokes `selectVoice`; `voice-preference-state.ts:54` only changes Zustand/AsyncStorage. Token requests contain no requested voice. API token creation resolves `user.chat_voice`. Mobile `voiceName` affects the prefetch key and fallback config, which the normal constrained-token path does not control. Chat settings does update the profile, but the initial picker does not. The call settings sheet starts a profile mutation without awaiting server completion before its saved callback.

Impact: a user can select Sue and get the existing/default server voice. The UI and acoustic identity disagree. A later settings change can race token prefetch.

Recommendation: one authoritative selection flow. Either persist and await profile acknowledgment before fetching a token, or send a validated requested voice to token creation and return the resolved voice. Invalidate cached tokens on selection revision, and display the resolved voice. Test first-ever choice, settings change and failed persistence.

### 3. Critical product limitation — production speakerphone is half duplex

Evidence: `eas.json:72` sets full duplex false. `voice-audio-policy.ts` requires explicit voice processing for iOS duplex. `voice-audio-engine.ts` drops speaker microphone input during audible/prebuffered output plus hangover. Headphones have a distinct bypass; initial greeting protection can still gate them.

Impact: “wait”, corrections, laughter and conversational overlap cannot reach the model during production speaker output. No prompt can recover audio never transmitted.

Recommendation: validate the native AEC path on TestFlight before changing production. Make audio route and actual processing availability part of call state. Keep safe fallbacks for unsupported routes, but expose the limitation honestly. Acceptance must include actual overlapping speech, not just tapping an interrupt button.

### 4. High validation risk — iOS watchdog patch is time-based and does not prove safe reconfiguration

Evidence: the audio-api patch records a one-second settling window after `setVoiceProcessingEnabled` and suppresses engine-configuration handling during it. It coalesces queued restarts. The notification handler does not use notification identity to establish that a suppressed event was caused by its own switch. Native setter failure logs and returns; mobile policy reports requested processing rather than confirmed native availability.

Impact: the patch addresses a plausible restart loop, but a genuine configuration change inside the window can be ignored, and a delayed self-generated notification can escape the window. If the native setter fails, full-duplex policy can remain enabled without successful processing. These are source-supported risks, not reproduced physical-device failures.

Recommendation: test and instrument actual applied processing state, route/format before and after change, engine generation and restart reasons. Filter notifications by engine where appropriate, reconcile state after suppressed events, serialize transitions, and propagate processing failure to the policy. Test rapid Bluetooth changes during call startup, repeated calls and incoming audio interruptions. C++ playback tests do not exercise Objective-C AVAudioEngine lifecycle.

### 5. High — response gate has a reproducible late-transcript boundary defect

Evidence: `VoiceResponseGate.acceptOutput()` marks a turn open for audio and transcription. `use-voice-mode.ts:474` calls it on output transcripts even after `turnComplete`. The hook explicitly permits transcription to arrive late. During that interval old audio may still be playing and the interrupt button remains usable.

Reproduced state sequence:

1. Accept model output.
2. Receive `turnComplete`: gate closes.
3. Receive late final output transcription: `acceptOutput` opens it again.
4. Tap interrupt while already-generated audio drains: gate starts discarding.
5. Next response output is rejected until its end because the old response has no further boundary to release the gate.

Recommendation: distinguish generated-audio response state from late transcription settlement and rendered-audio state. A late transcript must not reopen generation. Test this sequence through the integrated handler, including empty `finished` transcript events. Preserve the new gate's existing benefit: ordinary residual output before the old boundary is correctly discarded.

### 6. High — socket and tool work is not scoped to its originating session

Evidence: `use-voice-mode.ts:731` uses shared `handleLiveMessage` for all sockets; setup completion resolves mutable `setupReadyRef`. Reconnect opens a new socket before closing the previous one, and resets the response gate on success. Tool responses send through current `sessionRef`, not the originating session. Relay cancellation filters responses but has no dispose/abort lifecycle.

Impact: stale packets or late search results can mutate replacement-session state. A close is identity-checked, but ordinary messages are not. Resetting the gate also forgets any abandoned-response boundary. These are race risks, not live network reproductions in this review.

Recommendation: call ID, transport generation and response state must govern all callbacks, setup completion, tool work and output. Explicitly dispose a session and reject late work. Test old messages after swap and slow tools across hangup/new-call.

### 7. High — connection/recovery deadlines are incomplete

Evidence: `openLiveSession` awaits setup without a timer. Retry delays total ten seconds but each HTTP request has a 30-second timeout and each setup wait is unbounded. Network-change/go-away callers ignore false recovery results. Close codes are not retained by `onclose`. No reconnecting state is exposed to UI.

Recommendation: bounded setup and overall recovery, abortable attempts, explicit reconnect state and terminal handling. Preserve close reasons, distinguish intentional close from loss, and test silent connection loss and resume rejection. Do not equate retry delay totals with elapsed recovery time.

### 8. High — transcript durability depends on successful in-memory retries

Evidence: `VoiceTurnSync.pending` is in memory only. Teardown detaches it, flushes and retries once. Call-end metadata is fire-and-forget after successful flush. The generic offline queue does not integrate this voice path. Server turn uniqueness is helpful but does not replace a durable client outbox.

Recommendation: persist completed turns and call-end events before sending; retry with existing session/index idempotency. Isolate by account, recover after restart, and delete after acknowledgment. Let the call UI finish independently of slow archival work. Test process death/offline hangup and lost HTTP acknowledgments.

### 9. High data integrity — transcript repair can manufacture personal facts

Evidence: `../api/src/module/api/ai/voice/transcript-cleanup.ts` asks the model to repair user lines using the assistant's next reply as evidence. `guardCleanupFix` accepts an arbitrary proposed correction if it shares any content word with the original. For example, retaining “visited” is sufficient to pass the guard while replacing the person, place or date. Non-English speech can become `[unclear]`. Cleaned text is used for queued insights; `raw_text` is retained, which is good but does not prevent contaminated downstream facts.

Impact: an assistant misunderstanding can become evidence for rewriting the user's original statement and then entering future personal context. This matters especially for a legacy app.

Recommendation: separate verbatim transcript, suggested correction and confirmed facts. Use acoustic evidence or user confirmation for material entity/date/negation changes. Never treat the assistant's reply alone as truth about what the user said. Preserve non-English names and intentional code-switching even if spoken replies remain English. Evaluate correction accuracy, not just JSON validity/word overlap.

### 10. Medium/high — transcript merging and heard-history semantics remain weak

Evidence: `mergeVoiceTranscript('I went to Lagos', 'I went to Abuja')` returns both sentences concatenated. Received output transcription is persisted without alignment to rendered audio; queued speech can be interrupted before being heard. Late input finals can be attached to a pending previous turn depending on active interim state.

Recommendation: explicit delta versus snapshot semantics per provider/version, stable turn attribution and behavioral ordering tests. Record rendered audio position and interruption metadata. Do not claim a precise heard-text cutoff without alignment. Avoid blindly replacing all fragments, which would break genuine deltas.

### 11. Medium — memory retrieval quality and failure semantics need improvement

Evidence: fallback search OR-matches up to six words across title/summary/topics, orders by update time and returns five results. It omits body text there. Long-term retrieval runs in parallel, but errors/timeouts become empty results. Combined output is truncated to 1,500 characters and lacks structured source IDs. Dates come from record creation, not necessarily the described event.

Recommendation: hybrid retrieval with relevance ranking, entity/time filters and user-authored source excerpts. Return structured `found`, `no_match`, `unavailable` states and separate event dates from record dates. Preserve provenance and distinguish summaries from explicit facts. Fix finding 1 before evaluating this tool's conversational usefulness.

### 12. Medium — endpointing and playback dominate responsiveness

Evidence: 40 ms capture improves batching but does not remove 800 ms silence detection, model/network delay or 240 ms startup buffering. Adaptive recovery trades latency for continuity. The standalone `voice-vad.ts` is not wired into the production call path.

Recommendation: separately measure acoustic speech end, endpoint decision where available, first model audio, native first render and actual audible start. Compare complete utterances versus thinking pauses and backchannels. Trial semantic endpointing or a supported hybrid approach against the current baseline, rather than globally shortening silence. Confirm exact VAD parameter semantics against the pinned provider API before tuning; repository notes and current guide wording differ on prefix padding.

An end-to-audible p50 below 800 ms is an aspirational target requiring a change to the current 800 ms endpoint policy. It is not a reasonable claim for the unchanged control arm.

### 13. Medium — mute/greeting handling drops audio without explicit stream lifecycle

Evidence: mute stops audio sends; no `audioStreamEnd` appears in the audited path. Greeting protection can last up to 4.5 seconds in gated mode. Google documents a stream-end signal for extended microphone pauses.

Recommendation: explicit input open/paused/resumed state, protocol-correct pause signaling, and user-first or interruptible greeting once duplex is validated. Do not send stream-end for every tiny capture gap. Test muting mid-utterance and speaking immediately upon connection.

### 14. Medium — tool and context latency is incompletely bounded

Evidence: relay batches with `Promise.all`, waiting for the slowest response; cancellation does not abort work. Startup bounds Supermemory but not the entire context-building operation. Base system context performs several awaited reads. Prefetched constrained context may remain cached for three minutes, keyed without conversation/profile revision.

Recommendation: total startup/tool budgets, cancelable work, parallel independent context reads, stable-profile caching and revision-aware prefetch. Give slow tools bounded outcomes; use provider-supported asynchronous behavior where appropriate. Never send stale tool results into a later call.

### 15. Medium product gap — practical capabilities are narrow

Evidence: server declarations cover memory search, mute, hangup and navigation. There is no voice web research tool or targeted memory-save/correction tool in this configuration.

Recommendation: prioritize useful Memento actions: find/read an exact memory, draft/save a story, correct a remembered fact and optionally fetch current information with transcript citations. Provide authorization/idempotency and appropriate confirmation for consequential actions. Spoken acknowledgments must reflect actual tool success.

### 16. Medium — quality metrics are proxies and can reward bad behavior

Evidence: fixed RMS threshold estimates speech end from transmitted frames. Quiet speech can vanish from samples; noise can move the timestamp. Early interruption is labeled a cutoff even if intentional. Gated input hides attempted interruptions. Native clear-command timing is not acoustic silence. Reports are primarily emitted at teardown. Audio-policy attributes have now been added, which is an improvement.

Recommendation: label estimated metrics, include capture/render timestamps and per-turn observations, track failed/abandoned startups, and correlate tools/reconnects. Emit key lifecycle events before teardown. Evaluate interruption appropriateness with labeled recordings. Do not calculate population latency by taking a percentile of per-call medians.

### 17. Medium — test coverage misses important real contracts and event orderings

Evidence: several tests assert source substrings. Capability tests miss finding 1; gate tests miss finding 5. Physical-device checklist remains pending and includes contradictory background expectations. Passing C++ tests cannot validate iOS configuration-change behavior or actual echo cancellation.

Recommendation: integrated fake-provider tests plus physical release-build acceptance. Exercise actual mobile capability constants, controller parsing, token descriptors and tools as one contract. Test late transcripts, overlapping transports, setup deadlines, offline archival, permission denial and route changes. Use a single authoritative background-call requirement.

## Recommended architecture and delivery order

Keep native speech-to-speech. Introduce a small provider adapter around connection, input lifecycle, output events, interruption semantics and tool results. Keep session orchestration, archival and product tools independent of a specific SDK. Avoid a broad rewrite before addressing the verified contract bugs.

1. **Immediate correctness:** capability mismatch, authoritative voice selection, late-transcript gate bug, call/transport ownership and setup deadlines. Each needs a focused behavioral regression test.
2. **Audio validation:** verify actual AEC activation, safe route reconfiguration and TestFlight speaker duplex. Compare repairing the current stack with a native WebRTC audio path only if measured instability persists. Enable production by verified route/device cohort.
3. **Trustworthy memory:** durable outbox, transcript/fact separation, retrieval outcomes/provenance and context freshness. Fixing memory corruption is as important as improving recall.
4. **Conversation quality:** endpointing, interruptions versus backchannels, concise but flexible responses, user-led topic changes and useful tools. Tune one variable at a time with recordings.
5. **Provider comparison:** Gemini and OpenAI Realtime with equivalent context/tools and real mobile audio. Compare intelligibility, reasoning, grounded recall, latency, interruptions, robustness and cost per successful minute. Public API access is not proof of ChatGPT or Perplexity product parity.

## Acceptance targets and evaluation

Proposed targets, not measured app results:

| Dimension | Gate |
| --- | --- |
| Retrieval enabled | Actual mobile request produces memory tool in constrained token |
| Voice identity | Heard voice matches confirmed selection on first and subsequent calls |
| Reply latency | Eventually p50 <800 ms, p95 <1,200 ms on defined healthy-network ordinary turns; requires endpoint policy work |
| Interruption | p95 acoustic speech-start to silence <150–200 ms on supported duplex routes |
| Residual audio | No abandoned response resumes; next reply is never suppressed by late prior transcription |
| Memory integrity | No unsupported personal entity/date changes silently enter durable facts |
| Durability | No completed locally persisted turn lost across offline hangup/restart |
| Recovery | Bounded deadline, accurate UI, preserved context and no duplicate greeting |
| Acoustic stability | No repeatable clicks; ≤1 healthy-network underrun per five minutes as an initial target |

Build a 60–100-scenario evaluation set with consenting real speakers: Nigerian and other English accents, soft voices, names/code-switching, self-corrections, long reflective pauses, short factual answers, laughter, backchannels, overlapping speech, TV/fan/traffic, speaker/headphones/Bluetooth, slow tools and Wi-Fi/cellular handoffs. Include 20–30 minute calls and rapid route changes. Score comprehension, grounded recall, warmth, repetition, task completion, interruption appropriateness, latency and acoustic defects. Blind-listen to provider variants; do not use latency alone as the winner criterion.

## Verification performed in this review

- `bun test src/features/chat src/lib/sentry-tracing.test.ts`: **293 pass, 0 fail**, 879 assertions, 54 files.
- `bun run test:native-voice`: successful de-click and playback-quality executables.
- `bun run typecheck`: successful.
- Deterministic isolated reproductions: capability mismatch; late-transcript response-gate suppression; conflicting transcript concatenation.
- No production deployment, API test suite, live acoustic evaluation or iOS build was performed in this review. Native patch compilation/latency probe claims in the historical document were not independently revalidated.

## Official references

- [Google Live capabilities](https://ai.google.dev/gemini-api/docs/live-api/capabilities): audio stream pause signaling, VAD/hybrid endpointing and audio formats. These establish protocol options, not observed app quality.
- [OpenAI semantic VAD](https://developers.openai.com/api/docs/guides/realtime-vad): content-aware endpointing is a useful comparison candidate and may trade additional waiting for fewer premature turns.
- [OpenAI realtime conversation handling](https://developers.openai.com/api/docs/guides/realtime-conversations): interruption and removal of unplayed output from conversation state; WebSocket clients manage playback/truncation, while WebRTC/SIP have server-managed output buffering.
