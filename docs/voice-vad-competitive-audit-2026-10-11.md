# VAD and turn-taking competitive audit

Date: 2026-10-11. Scope: current mobile/API source and public voice-system documentation. No production telemetry or real-device recordings were available for this audit. This report proposes changes; it does not implement them.

## Verdict

ChatGPT Voice and Perplexity Voice are reasonable experience benchmarks: users will compare how naturally Memento listens and responds. Their exact deployed detectors, thresholds, and interruption policies are not established by the sources reviewed. Public API and framework documentation is an engineering reference, not proof of either app's private architecture.

Memento has a functional provider-VAD integration, but the inspected production speaker policy prevents natural interruption. Its client-side speech gate and quality metrics are also too crude to establish competitive turn-taking. Lowering the silence timer alone will not solve these problems.

## Current architecture

| Layer | Current source behavior | Assessment |
| --- | --- | --- |
| Capture | 640 samples at 16 kHz, or 40 ms per frame | Reasonable streaming granularity; not the first optimization target. |
| Provider detection | Automatic Gemini VAD, low start sensitivity, unspecified end sensitivity, prefix setting 200 ms | Conservative starting configuration; not a measured optimum. |
| Endpointing | 800 ms silence control; 450 ms experiment assigned per user | Fixed settings cannot adapt to every speaker or conversational pause. |
| Production speaker | Full duplex disabled; mic frames dropped while playback is audible | Spoken barge-in is unavailable during that gate. |
| TestFlight speaker | Full duplex and iOS voice processing requested | Different experience from production; native readback and device policy can still change effective behavior. |
| Full-duplex residual-echo gate | RMS >= 0.075, or RMS >= 0.055 and peak >= 0.12 | Loudness heuristic, not a speech or speaker-identity classifier. |
| Gate release | A qualifying frame opens a 1.5-second window | One transient can admit subsequent sound; softer onset before the trigger is discarded. |
| Interruption | Provider interruption advances playback epoch and flushes output | Useful foundation; actual onset-to-silence timing needs device measurement. |
| Mute | Now sends `audioStreamEnd` on transition to muted | Previous audit finding resolved in current source; not yet device-validated. |

Source anchors: `../api/src/module/api/ai/live-session-config.ts` (`VOICE_TURN_DETECTION`, `VOICE_TURN_FAST`); `eas.json`; `src/features/chat/voice-audio-policy.ts`; `voice-audio-engine.ts`; `voice-pcm.ts`; `src/hooks/use-voice-mode.ts` (`setMuted`, interrupted effect).

## Public engineering comparisons

OpenAI Realtime exposes semantic VAD, which estimates whether a thought is complete and can wait longer for trailing speech. This is evidence of a public API capability, not ChatGPT Voice's internal configuration. [OpenAI VAD documentation](https://developers.openai.com/api/docs/guides/realtime-vad#semantic-vad)

LiveKit separates endpointing from interruption handling. Its documented options include adaptive interruption classification, distinguishing acknowledgments from interruptions, and recovery after false interruptions. These are useful acceptance criteria for Memento rather than settings to copy verbatim. [LiveKit turn-taking tuning](https://docs.livekit.io/agents/logic/turns/tuning/)

Pipecat Smart Turn analyzes audio context and prosody to estimate turn completion, alongside a lightweight speech detector such as Silero. It illustrates why detecting silence and deciding that a thought is finished are different jobs. [Smart Turn repository](https://github.com/pipecat-ai/smart-turn)

## Prioritized findings

### P1 — Production cannot deliver normal speaker barge-in

The engine discards input during audible loudspeaker playback when full duplex is disabled. No provider VAD configuration can detect speech it never receives. This is the largest source-confirmed obstacle to natural turn-taking.

Fix direction: stabilize native echo cancellation and route handling, then roll out full duplex per tested device class. Retain fallback for unsafe devices and expose an immediate stop-speaking control. The audio-policy source documents prior iOS voice-processing hangs, so a global flag flip is insufficient.

### P1 — The active local gate does not classify speech

`isBargeInSpeech` uses fixed RMS and peak levels. Quiet speech can be rejected and loud non-speech can pass. Low provider start sensitivity adds another conservative layer after this gate. Neither proves who is speaking.

`voice-vad.ts` contains a more elaborate heuristic `VoiceActivityDetector`, but repository references show it is used by its tests, not the live engine. Its feature-weighted score is not a calibrated probability. Do not describe the shipped path as using that detector, or assume wiring it in would solve echo and turn-taking.

Fix direction: collect labeled post-AEC audio first. Evaluate a trained speech detector with onset/offset hysteresis and a short pre-roll buffer; preserve quiet initial phonemes. Validate noise and echo separately. A local speech detector remains distinct from a turn-completion model.

### P1 — Existing metrics can select the wrong experiment winner

`voice-latency.ts` uses the last sent frame above RMS 0.02 as speech end. Noise can shift that timestamp later; quiet speech can shift it earlier or omit a turn. The source comment claiming error can only make replies look faster is not generally valid.

`voice_reply_cutoffs` classifies provider interruption within two seconds of first received model audio as a cutoff. Intentional corrections also satisfy this condition, while production speaker gating hides attempted interruptions. The timer starts at received audio, not necessarily audible speech.

Fix direction: rename this as an early-interruption proxy. Track raw capture, post-processing, sent speech candidates, provider interruption, first audio receipt, first audible sample, and playback stop independently. Segment by actual route, effective duplex/AEC state, device, network, and experiment arm. Use human-labeled recordings to measure true premature replies.

### P2 — Fixed silence experiments do not establish natural endpointing

800 ms is a defensible conservative baseline for reflective storytelling, not evidence of optimal performance. 450 ms may improve short-answer latency while splitting a speaker's thought. There is no explicit application-level semantic completion policy in the inspected path; this does not establish what Gemini internally infers.

Fix direction: retain a control and evaluate a moderate arm before broadly deploying the aggressive setting. Choose based on audible latency plus labeled premature-turn rates. Include hesitation, emotional pauses, names, dates, lists, and unfinished clauses.

If fixed endpointing remains inadequate, compare provider-native turn-taking with a semantic/acoustic endpointing prototype. A local early-end signal can shorten waiting but cannot undo a turn the server already ended. A manual-VAD architecture would require explicit activity lifecycle ownership and is not a drop-in classifier change.

### P2 — No explicit acknowledgment/false-interruption policy

The inspected client handles provider interruption by ending the response and clearing playback. It does not explicitly distinguish a brief acknowledgment from a request to take the floor or restore speech after a false interruption.

Fix direction: measure how the provider behaves with “mm-hmm,” laughter, coughs, and “wait.” If deficient, add a tested policy. Do not blindly replay canceled audio: provider conversation state and subsequent user speech must remain consistent.

### P2 — Latency includes playback buffering

`native-voice-playback-controller.ts` configures a 240 ms startup buffer. This is an audio accumulation target, not a guaranteed extra 240 ms of wall-clock delay. Endpointing, transport/model latency, and playback readiness all affect what users hear.

Fix direction: optimize end-of-speech to first audible sample, with underrun rate as a guardrail. Avoid reducing buffers merely to improve a synthetic latency number.

### P2 — Automated tests do not validate conversational quality

Focused tests verify math, synthetic signals, policy branches, and timestamp bookkeeping. The PCM test's speech/echo labels do not demonstrate discrimination on real microphones. Test success cannot establish accent coverage, quiet-speech recall, echo rejection, or interruption quality.

## Recommended setup and rollout

1. Keep Gemini automatic VAD as the baseline while fixing audio delivery and measurements. Avoid simultaneous provider migration and endpointing changes.
2. Validate native AEC and route changes on production-equivalent iOS/Android builds before enabling speaker full duplex broadly.
3. Replace or calibrate the amplitude gate using labeled recordings; evaluate pre-roll and temporal speech confirmation without imposing excessive delay on short commands such as “stop.”
4. Run paired endpointing tests with a stable control. Do not mix speaker half-duplex results with headphone/full-duplex results.
5. Prototype semantic turn completion only after baseline measurements show the remaining limitation. Benchmark integration latency, supported languages, battery/CPU cost, and failure fallback.
6. Add explicit interruption-quality evaluation and recovery behavior where provider behavior falls short.

Do not transfer OpenAI VAD field names or numeric thresholds into Gemini configuration. Resolve any disagreement between provider guide, API schema, and installed SDK before changing `prefixPaddingMs`; it should not be treated as a general-purpose echo filter.

## Evaluation protocol

Use the same speakers, prompts, device routes, and network conditions across Memento and consumer-app benchmarks. Record app/build/date; repeat runs because model output varies. Do not infer private architectures from observed timing.

Initial corpus: at least 200 labeled utterances across at least 10 speakers, with accents representative of actual users. Include supported code-switching and quiet/older voices. This is a starting evaluation set, not statistical proof for every subgroup.

Scenarios:

- Complete short answer versus unfinished clause with 300–1,500 ms pauses.
- Long reflective story with breathing, hesitation, laughter, or emotion.
- Quiet correction while the assistant speaks; short “stop” and “wait.”
- Backchannel acknowledgment that should not necessarily take the floor.
- Fan noise, television/background speech, and loudspeaker echo.
- Headphone/Bluetooth changes, mute/unmute, and network jitter.

Measure separately: premature replies per labeled turn; missed intentional interruptions; false interruptions per assistant-speaking minute; speech-onset clipping; interruption onset to last audible output; speech end to first audible reply; playback underruns. Report p50/p95 and sample counts by route/device/language.

Proposed internal release targets, not published competitor statistics: at least 95% successful intentional interruptions on supported full-duplex routes; p95 interruption-to-silence below 300 ms; under 2% premature replies on the labeled corpus; p50 audible reply below 1 second and p95 below 2 seconds for simple non-tool turns on the defined healthy network. Revisit feasibility after the baseline, and do not hide subgroup failures in an aggregate.

## Verification performed

Command: `bun test src/features/chat/voice-vad.test.ts src/features/chat/voice-pcm.test.ts src/features/chat/voice-audio-policy.test.ts src/features/chat/voice-latency.test.ts`.

Result: 27 passed, 0 failed, 57 assertions. No real-device, acoustic replay, deployed-provider, or competitor timing tests were run. Application code was not modified by this audit. The working tree is actively changing; revalidate source findings before implementation.
