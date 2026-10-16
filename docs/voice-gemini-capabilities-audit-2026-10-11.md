# Voice audit: Gemini Live capabilities comparison

Date: 2026-10-11

## Scope and evidence

Comparison of the current mobile voice implementation and sibling API source against Google's Live API documentation, reviewed on the date above. This records the preceding source review; it is not a device test or verification of deployed configuration. The repository default is `gemini-3.8-live`; environment overrides may select another model.

The server's ephemeral-token constraints contain the authoritative session configuration. Changes to the mobile fallback configuration alone may therefore have no effect on the actual session.

Existing working-tree changes were present during review. Findings describe that snapshot, not a clean release commit. No implementation changes were made for this audit.

## Findings requiring action

### 1. High — Memory-search capability negotiation does not match

**Evidence:** `src/hooks/use-voice-mode.ts`, `CLIENT_CAPABILITIES`, advertises `SEARCH_MEMORIES_TOOL`, whose value in `src/features/chat/voice-tool-relay.ts` is `search_memories`. The API's `../api/src/module/api/ai/controller.ts` enables `memoryTool` only when capabilities include `memory_search`.

**Impact:** The normal mobile token request does not enable the retrieval tool. The assistant may receive initial memory context, but cannot use this path to search for additional memories during conversation. This can make it seem forgetful despite an implemented search backend.

**Recommendation:** Define one capability contract shared or contract-tested across mobile and API. Keep capability names distinct from function names only when the mapping is explicit.

**Acceptance:** A request built with the actual mobile capability list yields a token configuration containing `search_memories`; a live question requiring an additional memory invokes the tool and receives its result.

### 2. High — Production speaker mode blocks spoken interruptions

**Evidence:** `eas.json` sets production `EXPO_PUBLIC_VOICE_FULL_DUPLEX=false`. `src/features/chat/voice-audio-engine.ts` drops microphone frames while loudspeaker playback is audible when full duplex is disabled. `src/features/chat/voice-audio-policy.ts` also requires iOS voice processing before allowing speaker full duplex.

**Impact:** During this gate, corrections and requests to stop cannot reach the model. The behavior differs from headphones and from explicitly enabled test builds.

Google's VAD interruption mechanism needs incoming speech and requires clearing queued playback when interrupted. [Interruption guidance](https://ai.google.dev/gemini-api/docs/live-api/capabilities#voice-activity-detection-vad)

**Recommendation:** Treat reliable echo cancellation and speaker interruption as a release requirement. Do not simply enable the flag: the source documents prior iOS voice-processing hangs, and echo leakage can cause self-interruption.

**Acceptance:** On supported real devices, users can interrupt at normal volume without echo loops, clipped corrections, native hangs, or stale queued speech. Include headphones, speakerphone, route changes, and different output volumes.

### 3. High — Intentional microphone pauses do not flush the input stream

**Evidence:** `src/hooks/use-voice-mode.ts`, `setMuted`, changes local mute state; the capture callback drops frames. The inspected voice path has no `audioStreamEnd` send.

Google specifies this event when automatic-VAD audio pauses for more than a second, to flush cached input. [Automatic VAD](https://ai.google.dev/gemini-api/docs/live-api/capabilities#automatic-vad)

**Impact:** Muting after speech can leave cached input without an explicit stream-end signal. Actual turn-completion symptoms require runtime verification.

**Recommendation:** Model intentional uplink pauses explicitly and send `audioStreamEnd` once when appropriate. Audit speaker gating and other deliberate gaps as well as mute; do not attempt to flush a disconnected transport.

**Acceptance:** Speak, mute for several seconds, then unmute. Verify the pending utterance completes appropriately, audio resumes, and stream-end events are not emitted per dropped frame.

### 4. Medium — Native-audio session sends an unsupported language field

**Evidence:** `../api/src/module/api/ai/live-session-config.ts`, `buildLiveConnectConfig`, sets `speechConfig.languageCode: 'en-US'`.

Google says native-audio models select language automatically and do not support explicitly setting the language code. [Voice and language guidance](https://ai.google.dev/gemini-api/docs/live-api/capabilities#change-voice-and-language)

**Impact:** The setup conflicts with the documented contract. Whether the deployed endpoint ignores or rejects the field was not tested.

**Recommendation:** Remove the field from the authoritative configuration and use instructions for language preferences. Review greeting instructions if multilingual conversations are a product requirement.

**Acceptance:** Token creation and live setup succeed without the field; test English, another supported language, and a mid-conversation language switch.

### 5. Medium — Full-duplex amplitude gate may suppress quiet interruptions

**Evidence:** `src/features/chat/voice-audio-engine.ts` replaces microphone frames with silence during audible speaker playback until `isBargeInSpeech` opens the gate.

**Impact:** Quiet speech may never reach the provider's speech detector. Users may need to raise their voice. This is a source-derived risk, not a measured failure rate.

**Recommendation:** Evaluate the gate using captured audio and device-level echo tests. Prefer measured speech/echo separation over a universal amplitude threshold.

**Acceptance:** Compare interruption success and onset clipping across soft speech, distance, background noise, device models, and speaker volumes. Track false interruptions as well as missed ones.

## Missing or underused capabilities

These are opportunities, not all release-blocking defects.

| Capability | Current implementation | Why it matters and next step |
| --- | --- | --- |
| Google Search grounding | Live tools include memory search and app actions, but no `googleSearch`. | Enables current-world answers. Add grounding metadata and source presentation alongside the tool if web questions belong in Memento. |
| Independent tool results | `VoiceToolRelay.handle` waits for the entire `Promise.all` batch before sending results. | A slow lookup delays completed results. Send independently and define when background results should enter the conversation. |
| Hybrid endpointing | Server automatic VAD; 800 ms control and 450 ms experimental silence settings. No client endpoint signal. | Could reduce response delay, but aggressive endpointing can split reflective speech. Evaluate before adopting. |
| Live usage accounting | `voice-message-handler.ts` does not consume `usageMetadata`. | Complements existing latency instrumentation with call-level usage and context-growth visibility. |
| Visual input | The inspected voice uplink sends audio only. | Optional product expansion: discuss a photograph while showing it. Ordinary voice reliability takes priority. |

Google documents Live search grounding and asynchronous tool response scheduling. [Tool guide](https://ai.google.dev/gemini-api/docs/live-api/tools)

Hybrid VAD combines server speech-start detection with a client endpoint signal. [Hybrid VAD guidance](https://ai.google.dev/gemini-api/docs/live-api/capabilities#hybrid-vad)

For independent tool results, test a batch containing one fast and one slow operation, cancellation during execution, and call teardown before completion. A finished result should not wait for an unrelated slow result or leak into a later call.

## Model-specific caveats: do not add obsolete flags

The general guide includes examples that differ from the Gemini 3.8 model-specific contract. For the repository's default model:

- Proactive audio is permanently enabled; its missing configuration flag is not a missing feature.
- `enableAffectiveDialog` has been removed; do not add it.
- `thinkingLevel` should be omitted. Its absence does not mean the model lacks reasoning.
- Asynchronous function calling is the default. Missing `NON_BLOCKING` declarations alone do not prove tools block generation.

Use the model-specific migration rules when applying general examples. Recheck compatibility if the deployed model is overridden. [Gemini 3.8 Live model and migration documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live#migrating-from-gemini-31-flash-live)

## Already implemented

The inspected implementation already includes:

- Input and output audio transcription.
- Configurable provider voices and server-selected session configuration.
- Automatic VAD and a stable cohort for silence-duration experiments.
- Session resumption, reconnection handling, and context-window compression.
- Function-call responses and cancellation handling.
- Multipart model audio processing.
- Latency instrumentation and local playback controls.

These are source-level observations, not proof that every failure path works on devices. Avoid rebuilding them solely because they appear in the documentation.

## Recommended order

1. Fix and contract-test memory-tool capability negotiation.
2. Implement input-stream flushing for intentional pauses.
3. Remove the unsupported language field and verify live setup.
4. Validate echo cancellation and interruption behavior on production-equivalent devices.
5. Improve independent tool-result delivery and add Live usage accounting.
6. Evaluate grounded web answers and hybrid endpointing against product needs and measured outcomes.
7. Consider visual input only after core conversation reliability is established.

## Validation limits

No code was changed, no fresh automated tests were run for this comparison, and no deployed session or real-device call was exercised. Prior audit test results should not be interpreted as validation of these recommendations. Provider documentation was read on 2026-10-11 and may change. Repository paths above identify the reviewed symbols; line numbers are intentionally omitted because the working tree is under active development.
