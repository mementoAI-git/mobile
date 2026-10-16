# Voice Evaluation and Diagnostics Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax. Do not delegate unless the user or applicable instructions authorize delegation.

**Goal:** Produce reproducible evidence about Memento's voice quality without requiring the developer to own an iPhone, plus a simple workflow for remote physical-device validation.

**Architecture:** Share pure TypeScript event contracts, audio framing, scoring, and report generation between a desktop replay runner and mobile diagnostics. Separate deterministic offline replay, real-time provider experiments, and physical-device measurements. Instrument existing voice code rather than building an alternate implementation that merely resembles production.

**Tech stack:** Existing Bun/TypeScript tooling, existing Gemini SDK, existing React Native/Expo filesystem facilities, existing native C++ playback tests. Detector runtimes and archive dependencies must be evaluated and pinned only when required.

**Spec:** This document's requirements and interfaces, informed by [the VAD audit](../../voice-vad-competitive-audit-2026-10-11.md) and [the capabilities audit](../../voice-gemini-capabilities-audit-2026-10-11.md). This is an implementation guide, not evidence that the proposed system already exists.

## 1. Outcome and scope

Deliver four independently useful subsystems:

1. Offline corpus validation, audio replay, detector comparison, scoring, and reports.
2. Explicitly enabled live Gemini experiments using real-time pacing and bounded resource use.
3. Bounded mobile diagnostics with consented recording and explicit local export.
4. A remote tester protocol, benchmark report, and CI regression gates.

Do not change default VAD settings, enable production full duplex, migrate providers, or replace the audio architecture as a side effect. This project establishes evidence for those decisions. Do not claim a detector or framework fixes acoustic behavior before physical-device validation.

The developer can finish offline replay, event simulation, reporting, and much of live-provider evaluation without an iPhone. Physical-device acoustic validation remains a separate checklist with an honest pending status. Do not block useful software delivery waiting for that device.

## 2. Global constraints

- Follow root AGENTS.md, nested instructions, and `docs/modal-policy.md`.
- Preserve existing working-tree edits. Re-read current code before each task; audits are snapshots, not authoritative current source.
- Use existing UI components, tokens, SheetManager, field-level store selectors, and mounted-state protections.
- Put product data reads/writes in the existing query/mutation architecture. Pure evaluation code must not import React Native.
- Keep raw speech, transcripts, credentials, personal memory context, and provider token responses out of ordinary logs, Sentry, snapshots, and committed fixtures.
- No live provider calls in ordinary CI. Live execution must be explicit, bounded, and use synthetic/test-account context.
- Keep diagnostics disabled by default. A public build flag is not authorization to record a person's voice.
- Do not install multiple detector runtimes in the mobile bundle for a desktop comparison experiment.
- Use monotonic relative time for durations. Record wall time separately for human-readable run identification.
- Missing information is `null`/unknown or an explicit unavailable state, never zero, false, or a successful result.
- Pin schema and metric versions. Reports must distinguish measurements from proxies and simulation from device evidence.

## 3. Review focus

1. Quiet speech and suppressed frames must remain visible in consented evaluation data; a post-gate recording alone cannot prove what the user said.
2. Cancellation and reconnect must never send old audio or tool results into a new session.
3. Clock drift, scheduler stalls, and output-device latency must not create deceptively good latency measurements.
4. Corrupt input, disk-full errors, or diagnostics failure must never crash or prolong a voice call.
5. Consent withdrawal, app backgrounding, and interrupted export must leave no unintended recording or stale microphone ownership.

## 4. Current code inventory: inspect before changing

| Existing area | Reuse / inspect |
| --- | --- |
| `src/hooks/use-voice-mode.ts` | Session setup, microphone send callback, mute, interruption handling, reconnect, teardown, tool relay, usage observations. Keep orchestration changes narrow. |
| `src/features/chat/voice-audio-engine.ts` | Capture frames, suppression reasons, effective AEC/duplex policy, route handling, output epochs. |
| `src/features/chat/voice-pcm.ts` | PCM conversion and current RMS/peak gate. |
| `src/features/chat/voice-vad.ts` | Existing heuristic classifier, currently referenced by tests rather than the live engine. Label it as an experimental comparator. |
| `src/features/chat/voice-audio-policy.ts` | Requested versus effective full-duplex behavior. |
| `src/features/chat/voice-latency.ts` | Existing threshold-based speech-end and early-interruption proxies. Preserve compatibility or version migrations explicitly. |
| `src/features/chat/voice-session-metrics.ts` | Queue, route, output, underrun, and interruption metrics. Clarify event origins. |
| `src/features/chat/voice-telemetry.ts` | Existing report/Sentry integration; extend allowlisted fields, not raw payload logging. |
| `src/features/chat/voice-uplink-recorder.ts` | Existing development-only, nominally 60-second post-gate WAV recorder. It concatenates delivered chunks; do not assume it preserves elapsed gaps. |
| `src/features/chat/voice-message-handler.ts` | Decode actual provider messages; reuse for fixtures and live experiments. |
| `src/features/chat/voice-response-gate.ts` | Response/audio epoch acceptance. |
| `src/features/chat/voice-tool-relay.ts` | Tool completion and cancellation scenarios. |
| `src/features/chat/voice-playback-controller.ts` and `native-voice-playback-controller.ts` | Playback queue policies and event boundaries. |
| `modules/react-native-memento-voice/common/cpp/tests/` | Existing native playback test harnesses. |
| `modules/react-native-memento-voice/src/specs/NativeMementoVoiceAudio.ts` | Native interface; assess generated-code workflow before extending. |
| `modules/react-native-memento-voice/ios/MementoVoiceAudio.mm` | iOS AEC readback, routes, native lifecycle. |
| `eas.json` | Different production/TestFlight audio policies; export effective configuration in reports. |
| `../api/src/module/api/ai/live-session-config.ts` | Authoritative token-constrained configuration. |
| `../api/src/module/api/ai/controller.ts`, `service.ts` | Token capabilities, context, provider model selection, tools. Read-only unless backend work is explicitly in scope and filesystem permissions permit it. |

At this guide's inspection, mute already sends `audioStreamEnd`, usage tracking exists, and uplink recording exists. Do not reimplement old audit findings without checking.

## 5. Proposed file map

These are proposed paths, not claims that the files exist. Prefer extending an equivalent existing module if discovered.

```text
src/features/chat/voice-evaluation/
  contracts.ts                 # Versioned manifests, events, results
  validation.ts                # Runtime schema and bounds validation
  pcm-reader.ts                # Safe WAV decode and canonical PCM representation
  frame-buffer.ts              # Sample-contiguous reframing
  clock.ts                     # Injectable virtual/monotonic clocks
  replay.ts                    # Offline schedule and event replay
  live-pacer.ts                # Absolute-deadline real-time delivery
  scoring.ts                   # Label-derived metrics and denominators
  statistics.ts                # Quantiles, paired summaries, confidence intervals
  report.ts                    # JSON and escaped static HTML rendering
  detectors/types.ts           # Detector adapter contract
  detectors/current-gate.ts    # Production function adapter
  detectors/heuristic.ts       # Existing unused classifier adapter
  *.test.ts
src/features/chat/voice-diagnostics/
  collector.ts                 # Bounded event ring, counters, sequence ids
  consent.ts                   # Explicit collection state machine
  recording.ts                 # Segmented/timestamped optional capture
  redaction.ts                 # Allowlist and safe error categories
  export.ts                    # Snapshot, integrity manifest, cleanup
  retention.ts                 # Session/age/size limits
  *.test.ts
scripts/voice-eval/
  cli.ts                       # validate/replay/compare/live/report
  adapters/                    # Desktop-only WebRTC/Silero adapters
  provider.ts                  # SDK adapter and test-session bootstrap
  corpus/                      # Import/conversion helpers
  README.md
tests/fixtures/voice/
  manifests/                   # Small licensed/synthetic protocol fixtures
  events/                      # Sanitized provider event sequences
  audio/                       # Small synthetic PCM fixtures only by default
docs/voice-evaluation/
  corpus-authoring.md
  remote-device-test-script.md
  interpreting-results.md
  baseline-report.md
```

Keep consent UI as a registered sheet or established settings surface. Determine the exact registration files from current SheetManager; do not invent a parallel modal mechanism.

## 6. Evidence levels

Every run must declare exactly one primary evidence level:

| Value | Meaning | Must not claim |
| --- | --- | --- |
| `offline_detector` | Labeled PCM processed by a detector | Provider latency or native acoustic success |
| `simulated_session` | Recorded/synthetic events and virtual transport/playback | Real network or audible latency |
| `live_provider` | Audio paced into an actual provider session | iPhone AEC or actual speaker-output latency without a measured device |
| `device_instrumented` | Native/app event timestamps on a physical device | Exact acoustic timing when only render callbacks are available |
| `device_acoustic` | Physical recording with calibrated alignment and human labels | Population-wide performance from a handful of calls |

Simulator runs must explicitly identify `physicalDevice=false`. Runtime playback callbacks are estimates of rendering, not microphone measurements of the last audible sample.

## 7. Corpus contract

Use versioned JSON validated at runtime. A representative fixture:

```json
{
  "schemaVersion": 1,
  "id": "reflection-pause-001",
  "audio": {
    "path": "audio/reflection-pause-001.wav",
    "sha256": "REPLACE_WITH_ACTUAL_SHA256",
    "sampleRateHz": 16000,
    "channels": 1,
    "encoding": "pcm_s16le"
  },
  "speakerId": "speaker-004",
  "languageTags": ["en-NG"],
  "scenario": "unfinished_thought",
  "provenance": {
    "kind": "consented_human",
    "licenseOrConsentRecord": "private-reference-only",
    "redistributable": false
  },
  "segments": [
    {"startSample": 0, "endSample": 16000, "label": "speech"},
    {"startSample": 16000, "endSample": 28800, "label": "within_turn_pause"},
    {"startSample": 28800, "endSample": 48000, "label": "speech"}
  ],
  "turns": [{"id": "u1", "startSample": 0, "endSample": 48000}],
  "interruptions": [],
  "annotation": {"status": "reviewed", "version": 1}
}
```

The placeholder hash is invalid intentionally; examples must never masquerade as usable fixtures. Add optional reference transcript in a private sidecar, separately consented and excluded from general exports. Keep speaker IDs pseudonymous; do not derive them from emails or device IDs.

Additional supported labels: `non_speech`, `background_speech`, `assistant_echo`, `breath`, `laughter`, `backchannel`, `intentional_interruption`, `uncertain`. Separate overlapping sound sources into tracks or source annotations; do not force all overlap into one mutually exclusive segment list.

For each interruption label, store expected intent, user onset sample, assistant turn/epoch association if known, and whether the ground truth is human-reviewed. Background speech is speech acoustically but may be irrelevant conversationally; score those tasks separately.

Validate: safe relative paths, no traversal, finite integer bounds, start < end, within audio duration, correct hashes, supported encoding, unique IDs, declared overlap policy, and nonempty provenance. Reject unsupported schema versions clearly. Never silently repair corrupt samples.

### Corpus creation

- Start with deterministic generated silence, tones, impulses, clipped signals, ramps, and framing fixtures. These test engineering correctness, not speech quality.
- Add permitted human recordings using a written prompt sheet. Preserve natural pauses; avoid editing away breaths.
- Aim initially for 200 utterances and 10 speakers, with separate held-out speakers. This is a collection target, not a completion claim when recordings are unavailable.
- Include complete answers, unfinished clauses, hesitation, dates/names, emotional/reflective speech, soft speech, short stops, acknowledgments, fans, background speech, and route-specific recordings.
- Keep a frozen evaluation split. Do not tune thresholds on the same clips used to claim improvement.
- Store conversion settings and original hashes. Do not loudness-normalize all clips for the primary quiet-speech evaluation; that removes the condition being measured.
- Synthetic assistant/user mixing is a synthetic stress test, not an iPhone echo-cancellation benchmark.
- If external datasets are added, verify redistribution and permitted use before committing or shipping them. Private recordings stay outside Git.
- Have a second reviewer annotate ambiguous turn boundaries where practical. Track uncertainty and exclude uncertain spans from hard pass/fail with counts reported.

## 8. Shared interfaces and clocks

Implement exact equivalent interfaces; refinements must be documented with consumers updated together:

```ts
type EvidenceLevel = 'offline_detector' | 'simulated_session' |
  'live_provider' | 'device_instrumented' | 'device_acoustic';

interface EvalClock {
  nowMs(): number; // monotonic, run-relative
  waitUntilMs(deadline: number, signal?: AbortSignal): Promise<void>;
}

interface AudioFrame {
  sequence: number;
  startSample: number;
  sampleRateHz: number;
  pcm: Int16Array;
}

interface DetectorDecision {
  startSample: number;
  endSample: number;
  speech: boolean;
  score?: number; // only if adapter exposes it; not automatically calibrated
}

interface DetectorAdapter {
  readonly id: string;
  readonly version: string;
  readonly sampleRateHz: number;
  readonly frameSamples: number;
  reset(): void;
  process(frame: AudioFrame): DetectorDecision | Promise<DetectorDecision>;
  close(): void | Promise<void>;
}

interface EvalEvent {
  schemaVersion: 1;
  runId: string;
  sequence: number;
  atMs: number;
  source: 'capture' | 'engine' | 'transport' | 'provider' | 'playback' | 'tester';
  type: string; // implement as discriminated union with typed allowlisted payloads
  transportEpoch?: number;
  playbackEpoch?: number;
  turnId?: string;
  payload: Record<string, string | number | boolean | null>;
}
```

Use sample indices for audio labels and duration math. Use monotonic timestamps for scheduling and runtime events. Do not subtract timestamps from different processes/native clocks without an alignment mapping and uncertainty estimate. Persist UTC start time as metadata only. Tests inject virtual clocks, not real sleeps.

Event union must include capture summary, gate suppression with reason, audio send attempt/success/failure, setup ready, transcript metadata, output received, playback scheduled/render started/stopped, interruption received, response rejected by epoch, route changed, AEC state changed, mute changed, reconnect begin/end, tool lifecycle metadata, underrun, overflow, consent changed, export result, and teardown.

Never put base64 audio or transcript text into generic event payloads. Keep optional audio/transcripts in separate files. Sequence order breaks ties when timestamps are equal.

## 9. PCM and replay behavior

- Canonical evaluation audio: mono signed PCM16 little-endian at 16 kHz. Output provider audio keeps its declared sample rate; do not assume all tracks share a rate.
- WAV reader must parse chunks rather than assuming a 44-byte header; skip supported metadata chunks and validate odd-byte chunk padding. Reject float, stereo, compressed, truncated, or unsupported input unless an explicit conversion command is used.
- Conversion should be an explicit preprocessing step with a recorded tool/version/config. Do not introduce a silent resampler inside each detector adapter.
- Reframe continuously across original capture boundaries. Preserve every sample and state across frames; reset at recording/session boundaries.
- Handle final partial frames using a declared padding policy. Exclude padded samples from scored duration.
- WebRTC adapter must validate its pinned implementation's supported frame lengths. Our 40 ms chunks require reframing. Silero frame/state requirements must be read from the selected version, not copied from an unrelated historical example.
- Offline replay uses virtual time and should be deterministic. Provider-event replay must preserve arrays of parts, interruption order, transcripts, cancellation, and epochs.
- Do not substitute a fake success result if an optional native/Python detector adapter is unavailable. Report `skipped_dependency` and installation instructions.
- Run detector timing separately from simulated audio timestamps. Report warmup policy, CPU/runtime, real-time factor, and inference timing; these are not phone performance measurements.

## 10. Live-provider runner

Live mode is opt-in and separate from offline commands. Proposed command contract:

```sh
bun run voice:eval -- validate --manifest /path/to/corpus.json
bun run voice:eval -- replay --manifest /path/to/corpus.json --detector current-gate --out /tmp/voice-eval
bun run voice:eval -- compare --baseline /path/baseline.json --candidate /path/candidate.json --out /tmp/voice-comparison
bun run voice:eval -- live --manifest /path/test-corpus.json --max-calls 5 --max-audio-seconds 120 --out /tmp/voice-live
```

These commands are proposed and must be added to `package.json`; they do not exist yet. Default live concurrency is 1. Require explicit maximum calls/audio duration; enforce per-session setup, first-response, idle, and total deadlines. Initial configurable limits: setup 15 s, first response after expected completed turn 20 s, total session 90 s; include actual values in report. Do not label deadline failures as slow successful replies.

Authentication options:

1. Preferred parity mode: existing test-account ephemeral-token endpoint and authoritative server config. Preserve constraints; mobile fallback settings cannot override a locked token.
2. Isolated provider experiment: a runner-only credential supplied through environment, with a test-only prompt/config and no production memory data. Label `configurationParity=false`.

Never read or print all of `.env`; accept documented variable names only. Never embed credentials in generated reports or fixtures. A provider experiment must record actual model/config hash, API/SDK version, prompt hash, tools enabled, and parity mode. Model environment overrides must be visible.

Wait for provider setup completion before sending. Stream frames against absolute deadlines derived from sample position, rather than repeated relative sleeps. Log scheduler lateness. If a stall exceeds a configurable threshold (initial 200 ms), abort or mark the trial invalid; do not silently burst queued audio and present it as real-time behavior. Transport congestion must produce bounded behavior and explicit accounting, never an unbounded queue.

Subscribe to all provider events before sending. Use the actual message handler wherever practical. Wait for trailing output/transcripts with bounded completion logic appropriate to the selected model. Do not assume a received audio packet is audible playback.

For interruption tests, trigger a user clip relative to observed assistant output onset, record that alignment, and declare whether actual local audio playback was present. Injection into a socket tests provider interruption, not acoustic echo cancellation.

Use controlled fixtures for tools; disable external side-effect tools. Capture tool delay separately from conversational response delay. On cancel/error, stop pacing, close session, dispose adapters, finalize a partial report, and clear timers. Distinguish auth, quota, provider, transport, scheduler, and evaluation errors. Do not retry a failed trial invisibly; record attempts separately.

## 11. Diagnostics and recording design

### Collection modes

`off` → `metadata_only` → optionally `recording_consented` → `stopped` → `exported` or `deleted`.

Audio recording requires explicit per-session opt-in explaining what is captured. Capture no pre-consent samples. A visible recording indicator and stop/delete action are required. Keep normal microphone mute semantics: diagnostics must not retain muted microphone audio. Clear any pending pre-roll on consent withdrawal or mute.

Metadata-only collection may include coarse route category, build, effective audio policy, durations, counts, and sanitized error categories. Do not include memory contents, names, stable user IDs, full URLs, auth headers, or arbitrary provider error text. Restrict exports to tester-enabled surfaces rather than enabling automatic customer recording.

### Capture tracks

- `capture_post_platform_processing`: microphone frames before our custom gating, only with active consent and unmuted state. Do not call this raw mic if platform AEC has already processed it.
- `uplink`: exact attempted/successfully handed-off provider frames, with success semantics documented. Preserve timestamps and missing intervals.
- `model_output_received`: optional provider PCM, separately labeled from rendered output.
- `device_acoustic_reference`: externally collected recording, imported explicitly with alignment notes.

The existing uplink recorder concatenates delivered chunks. Preserve its development use or migrate carefully, but do not use a concatenated WAV as a wall-clock-aligned trace. Export segment sample ranges and start times, or reconstruct gaps with silence while marking those gaps as missing/suppressed—not recorded silence.

### Resource bounds

Proposed initial limits: metadata ring 10,000 events / 5 MB serialized ceiling; recording 120 seconds per selected track; retained diagnostic sessions 5; total diagnostic storage 50 MB; automatic local expiry 7 days. All are configuration constants tested at boundaries, recorded in exports, and adjustable after overhead measurement.

At 16 kHz mono PCM16, 120 seconds is 3.84 MB before container overhead. Account independently for 24 kHz output and multiple tracks. Enforce sample/byte limits exactly, including a chunk crossing the cap. Emit a truncation/overflow event and dropped counts. Limit diagnostic overhead without blocking audio callbacks; batch writes off the real-time path and use bounded queues. Disk-full/permission errors disable recording gracefully while the call continues.

Do not JSON-stringify events, encode archives, or perform file I/O in a native real-time callback. Prefer aggregated frame counters at a modest cadence plus transitions. Test diagnostics-on/off overhead; choose an initial budget of under 5% relative CPU increase on the measured device and no additional underruns, explicitly a proposed target rather than a proven property.

### Export package

```text
manifest.json       # schema, evidence, build, config, consent categories, limits
events.jsonl        # ordered sanitized events
summary.json        # metrics, denominators, missingness, failures
audio/index.json    # optional timestamps, gaps, checksums, sample formats
audio/*.wav         # only consented selected tracks
labels.json         # optional tester annotations
README.txt          # interpretation and limitations
```

Build a snapshot so collection cannot mutate an in-progress export. Use a temporary directory and atomic finalization where available. Include SHA-256 hashes for files. If an archive dependency is needed, select one compatible with current Expo and bounded memory behavior; do not assume Node ZIP APIs work on mobile. Provide a directory export for desktop tooling and use the native share sheet for mobile. Never upload automatically.

Before sharing, show whether audio and transcripts are included and allow metadata-only export. Clean temporary packages after canceled shares where possible and on the next startup via retention cleanup. Do not delete unrelated user files; use a dedicated diagnostic directory.

## 12. Metric definitions

Every metric carries `version`, unit, evidence level, numerator/denominator, eligible count, missing count, excluded count/reasons, and relevant labels/config.

| Metric | Definition / limits |
| --- | --- |
| Speech recall | Correctly detected labeled target-speech duration / total eligible target-speech duration. Exclude uncertain spans; report quiet subset separately. |
| Non-speech false-positive rate | Non-speech duration classified as speech / eligible labeled non-speech duration. Background speech needs a separate relevance score. |
| Speech onset delay | First detector-positive sample after labeled onset minus onset. Report completely missed segments separately; do not drop them from success-rate denominators. |
| Premature reply rate | Labeled user turns with assistant output beginning before the intended turn end / eligible user turns. State whether output means received, rendered, or acoustic. |
| Audible reply latency | First acoustic output after a completed user turn minus labeled end; native render estimates must have a different name. Negative values are premature overlap, not fast success. |
| Provider response latency | First provider audio received minus labeled end at the runner; includes pacing/network and is not audible latency. |
| Intentional interruption success | Labeled attempts that stop the associated assistant output within a declared window / all eligible attempts while output was active. Report blocked attempts. |
| Interruption-to-silence | User onset to last audible assistant output; event-to-render-stop is a distinct proxy. Distinguish network/provider, engine cancellation, and output-device contributions. |
| False interruption rate | Interrupted assistant turns without labeled intent, per assistant-speaking minute; exclude ambiguous labels and show counts. |
| Onset loss | Expected speech samples absent/suppressed from uplink around onset, using aligned source/uplink tracks. |
| WER | (substitutions + deletions + insertions) / reference words; define language-specific normalization and report empty-reference cases separately. Not a standalone VAD score. |
| Underruns | Count and duration, per playback minute; separate end-of-turn drain from starvation. |
| Scheduler lateness | Actual send time minus sample-derived deadline; summarize and invalidate unacceptable trials. |

Keep legacy RMS-based speech-end and early-interruption metrics only as explicitly named proxies. Never relabel old dashboards silently. A quiet tail can make the RMS speech-end estimate too early; noise can make it too late.

Compute p50/p95 using a documented quantile convention. Include sample counts and missing/failed trials; no zero-filled missing data. Aggregate paired comparisons on identical fixtures/config and use speaker-level resampling for confidence intervals when enough speakers exist. A small synthetic set cannot support a population claim. Avoid treating thousands of frames from one speaker as thousands of independent users.

## 13. Test matrix

### Deterministic correctness

- WAV extra chunks, truncated headers, endian/sample conversion, odd payloads, unsupported formats, hash mismatch, path traversal.
- Reframe 640 input samples into adapter-sized windows without loss/duplication; multi-chunk boundaries and final padding.
- Reset model state between speakers/sessions; preserve it within a clip.
- Exact metric hand-calculation fixtures; empty/no-speech, no-response, all-missed, uncertain labels, negative latency, repeated interruptions.
- Identical replay produces identical normalized reports excluding explicitly nondeterministic run metadata.
- Fake clock moves without wall sleeps; live pacer detects deadline misses and cancellation.
- Mixed multipart provider messages, late transcripts, cancellation before first audio, stale epochs, old socket events, reconnect, partial tool results.
- Recorder cap crossed mid-chunk, mute/withdrawal clears pending samples, disk failure, overflow, app termination, interrupted export, retention bounds.
- Redaction fixtures contain token-like strings, personal text, URLs, and injected HTML; no sensitive value survives allowlisted output. HTML report escapes all fixture-controlled content and contains no remote scripts.

### Device/protocol scenarios

- Speaker at low/medium/high volume; quiet and normal speech; short “stop”; soft correction.
- Unfinished clause with 300/800/1,500 ms pauses; completed short answer; long narrative.
- “Mm-hmm,” laugh, cough, fan, background television; label intent separately from acoustic speech.
- Wired/Bluetooth routes, disconnect/reconnect mid-turn, output-volume change, background/foreground, permission rejection/revocation.
- Mute immediately after speech, mute during assistant output, unmute and speak; verify no recording while muted.
- Network interruption and recovery while speaking; preserve session accounting and avoid duplicate turns.

## 14. Remote iPhone protocol

Create a plain-language tester sheet with screenshots only after UI exists. Tester needs a supported iPhone, the test build, headphones if available, and a quiet room. A second device for acoustic recording is optional and requires consent from everyone recorded.

1. Confirm build and scenario ID; start metadata diagnostics. Explain optional recording separately.
2. Quiet room, speaker medium volume: ask a short question, then tell a 30-second story with natural pauses.
3. While assistant speaks, say “wait” normally, then repeat with a quiet correction on a new turn.
4. Try “mm-hmm” without intending to stop it. Record whether it stopped and whether that was appropriate.
5. Repeat selected scenarios with headphones and higher speaker volume. Never change several conditions without labeling them.
6. Mute/unmute, change an available audio route, background/foreground, and perform one bounded network interruption.
7. Stop diagnostics, review included data, export explicitly, then delete locally if desired.
8. Record subjective ratings separately: heard my correction, waited for my thought, response delay, audio continuity. Include free-text notes and scenario timestamps.

App controls should mark scenario start/end automatically where feasible. Human taps are approximate annotations, not exact speech onset. A second-device recording must align through a deliberate calibration cue before the measured scenario; document drift/uncertainty. Do not compare its clock directly with native timestamps without alignment.

Aim for an initial quiet-room 10-minute session, with route/noise extensions optional. No physical-device access means this checklist remains pending, not passed. Android results are useful but do not establish iOS behavior.

## 15. Implementation tasks

### Task 1 — Inventory and versioned contracts

**Files:** create `contracts.ts`, `validation.ts`, associated tests and CLI skeleton with `validate`; add package command and ignore local recordings/reports.

**Consumes:** existing audits and current source. **Produces:** validated `CorpusManifest`, `RunManifest`, `EvalEvent`, evidence levels.

- [ ] Inspect instructions, git status, current diagnostics, and test conventions; document existing behavior without modifying unrelated files.
- [ ] Write failing schema tests for invalid time bounds, traversal, missing provenance, unsupported version, and unknown evidence.
- [ ] Implement contracts/validation and a helpful validation CLI exit status.
- [ ] Run focused tests; demonstrate valid and invalid sample manifests.
- [ ] Review sensitive-data and Git ignore behavior; record checkpoint.

### Task 2 — Audio reader, reframer, and virtual replay

**Files:** create `pcm-reader.ts`, `frame-buffer.ts`, `clock.ts`, `replay.ts`, tests and small generated fixtures.

**Consumes:** validated manifest. **Produces:** sample-contiguous `AudioFrame` stream and ordered events.

- [ ] Write failing tests for metadata WAV chunks, partial frames, chunk boundaries, and corrupt audio.
- [ ] Implement parsing/reframing with exact sample accounting and documented final padding.
- [ ] Add virtual clock and replay; prove determinism without sleeps.
- [ ] Test cancellation, state reset, and independent fixture runs.
- [ ] Record checkpoint with sample counts and fixture hashes.

### Task 3 — Baseline adapters and optional detector comparison

**Files:** create detector contracts/adapters; desktop-only optional adapters under `scripts/voice-eval/adapters/`.

**Consumes:** frames. **Produces:** versioned detector decisions and compute timing.

- [ ] Test adapter reset, unsupported format, score absence, and unavailable dependency reporting.
- [ ] Wrap actual production gate and existing heuristic without copying their algorithms.
- [ ] Select/pin maintained WebRTC and Silero implementations after reading current interfaces/licenses; document runtime prerequisites. No mobile dependency yet.
- [ ] Implement optional adapters with version/config hashes and frame/state validation.
- [ ] Run the same fixtures across adapters; report missing real corpus explicitly.
- [ ] Review evidence limits and runtime overhead; record checkpoint.

### Task 4 — Metrics and comparison reports

**Files:** create `scoring.ts`, `statistics.ts`, `report.ts`, tests; CLI `compare`/`report`.

**Consumes:** labels, decisions, events, run manifests. **Produces:** JSON and standalone escaped HTML.

- [ ] Write hand-calculated tests including all-missed speech, negative latency, missing output, and excluded ambiguous spans.
- [ ] Implement metric definitions and explicit eligibility/missingness accounting.
- [ ] Add paired baseline/candidate views, per-scenario breakdowns, version mismatch rejection, and sample counts.
- [ ] Implement offline HTML with no external assets; verify escaping, readable tables, and valid links.
- [ ] Generate a synthetic baseline report clearly labeled non-acoustic; record checkpoint.

### Task 5 — Live Gemini experiment runner

**Files:** create `live-pacer.ts`, `scripts/voice-eval/provider.ts`; extend CLI and tests.

**Consumes:** fixture, bounded run settings, explicit authentication. **Produces:** live-provider event trace and partial/final result.

- [ ] Test absolute pacing, stalls, timeout paths, setup ordering, cancellation, and cleanup using fake transport/clock.
- [ ] Implement provider adapter reusing decoding and test configuration parity checks.
- [ ] Add limits, safe error categories, no implicit retries, and config/prompt hashes.
- [ ] Verify credentials never enter reports or console output.
- [ ] Run live tests only with authorized credentials/test context and explicit limits; otherwise deliver runner with this verification pending.
- [ ] Record exact model/config and distinguish live outcomes from fixtures.

### Task 6 — Bounded metadata diagnostics

**Files:** create diagnostics collector/redaction/retention and tests; minimally instrument hook, engine, playback controllers, telemetry.

**Consumes:** actual runtime transitions. **Produces:** bounded sanitized event snapshot with effective device/audio policy.

- [ ] Test ring limits, dropped-event counts, stale epochs, redaction, and clock mapping.
- [ ] Instrument transitions and aggregate high-frequency frame data off the audio callback.
- [ ] Record requested/effective/unknown AEC and duplex states separately.
- [ ] Preserve normal voice behavior when collector throws or reaches limits.
- [ ] Test diagnostics off/on parity with fake runtime; record checkpoint.

### Task 7 — Consented aligned recording and export

**Files:** create consent/recording/export modules and tests; integrate existing uplink recorder deliberately; register diagnostics UI in current SheetManager/settings.

**Consumes:** active session, consent, selected tracks, events. **Produces:** validated export package and deletion controls.

- [ ] Test consent transitions, muted-frame exclusion, pre-consent exclusion, mid-chunk caps, partial writes, cancellation, and disk failure.
- [ ] Implement timestamped segments and gap index; avoid treating concatenated uplink as continuous elapsed audio.
- [ ] Add bounded asynchronous writes, atomic snapshot/export, hashes, retention, and local deletion.
- [ ] Build clear opt-in/status/export controls using approved components and token system.
- [ ] Verify metadata-only export contains no audio/transcript; verify share cancellation cleanup.
- [ ] Test app unmount/background handling and failed export without ending the call; record checkpoint.

### Task 8 — Native timing and playback regression coverage

**Files:** existing native module spec/implementation only where needed, controller tests, C++ tests.

**Consumes:** playback epoch/state and native render timing. **Produces:** documented render estimates and cancellation invariants.

- [ ] Inspect native clock and callback semantics before inventing a timing field.
- [ ] Add tests for cancellation with queued audio, repeated epochs, underrun versus normal drain, and route teardown.
- [ ] Implement minimal native metadata additions off the real-time critical path; update bindings through existing generation process.
- [ ] Run `bun run test:native-voice`; do not call render callback timestamps acoustic truth.
- [ ] Record physical-device validation pending where applicable.

### Task 9 — Corpus workflow, tester script, CI, and handoff

**Files:** docs listed in file map, package scripts, current CI workflow, baseline report.

**Consumes:** completed tools. **Produces:** reproducible execution instructions and evidence report.

- [ ] Document corpus intake, labeling, private storage, conversions, and held-out split.
- [ ] Write remote-device script and export interpretation guide.
- [ ] Add offline deterministic checks to CI; explicitly exclude network/live mode and private fixtures.
- [ ] Run focused suites, typecheck, relevant lint and native checks; capture actual outcomes.
- [ ] Publish a local baseline report with available evidence and missing-data status, not fabricated performance numbers.
- [ ] Provide exact commands, installed prerequisites, known limitations, and pending live/device tests.

## 16. Verification commands and completion rules

Existing commands to use where relevant:

```sh
bun test src/features/chat/voice-vad.test.ts src/features/chat/voice-pcm.test.ts src/features/chat/voice-audio-policy.test.ts src/features/chat/voice-latency.test.ts
bun run typecheck
bun run test:native-voice
```

Add and run tests under the new evaluation/diagnostics directories using repository conventions. Run broader checks when integrations warrant them. Record pre-existing failures distinctly; do not silently repair unrelated work. No executable feature is complete without an actual command result, and no device claim is complete based on mocks alone.

Completion deliverables:

- A clean-checkout offline command that validates fixtures and generates a reproducible report without credentials.
- At least one intentionally failing quality fixture proving the scorer detects a real regression, not just happy paths.
- Optional detector dependencies fail clearly and do not block baseline evaluation.
- Live runner with explicit resource limits, cleanup, safe authentication, and setup/config parity reporting.
- Mobile diagnostic metadata export and separately consented audio recording with tested resource/privacy bounds.
- Tester script executable by someone other than the developer.
- A final report separating implementation complete, offline verified, live-provider verified, and device/acoustic pending or verified.

Proposed eventual quality goals: >=95% intentional interruption success on tested full-duplex routes; p95 acoustic interruption-to-silence <300 ms; <2% labeled premature replies; p50 audible simple non-tool reply <1 s and p95 <2 s on a specified healthy network. These are internal starting targets, not competitor statistics or unconditional pass gates before enough human data exists. Always report subgroup failures and uncertainty.

## 17. Copy-ready implementation prompt

```text
Implement docs/superpowers/plans/2026-10-11-voice-evaluation-implementation.md.

Read AGENTS.md, relevant nested instructions, docs/modal-policy.md, and the linked
voice audits. Reinspect current source: old audit findings may already be fixed.
Preserve unrelated working-tree changes. Follow the plan task-by-task, using
focused tests and independently reviewable checkpoints. Do not delegate unless
authorized by the user or applicable instructions.

Build the offline evaluation harness, bounded opt-in live-provider runner,
mobile diagnostics/export, and remote tester workflow. Reuse the existing PCM,
provider-message, playback, telemetry, and recorder code. Do not create a second
production voice pipeline just to make tests pass.

Keep default voice behavior unchanged. Do not enable production full duplex,
change VAD thresholds, migrate providers, or install experimental detector
runtimes in the mobile app as a side effect. Optional desktop detector adapters
must record exact versions and unavailable dependencies honestly.

Use sample-indexed labels and monotonic event timing. Keep offline, simulated,
live-provider, native-render, and acoustic evidence distinct. Track dropped
frames and failed trials; never replace missing data with zero or success.
Use actual production decoding/gating functions where practical.

Recording must be explicit and per-session, off by default, visible, bounded,
and stop on mute or consent withdrawal. Never export secrets or personal memory
context. Preserve gaps/timestamps in recordings. Export locally only after a
user action; implement deletion and retention. Diagnostics failures must not
break calls or perform blocking work in audio callbacks.

No live API calls in CI. If credentials or device access are unavailable, finish
all independent offline implementation and document precisely which validation
remains pending. Do not claim iPhone AEC validation from a simulator or mixed
audio replay. Do not fabricate a human corpus or competitor measurements.

Deliver working CLI commands, tests, sanitized sample reports, diagnostics UI,
tester documentation, and a final verification report. Report exact commands
run, failures, dependencies, changed behavior, and remaining live/device checks.
Do not stop at scaffolding, interfaces, or a proposed plan; implement and verify
the authorized software scope while keeping external validation honest.
```

## 18. Research references for implementers

These are starting references from the audit, not pinned dependency specifications. Re-read current primary documentation before implementing provider or model contracts:

- [Gemini Live capabilities](https://ai.google.dev/gemini-api/docs/live-api/capabilities)
- [WebRTC VAD source reviewed](https://chromium.googlesource.com/external/webrtc/+/branch-heads/43/webrtc/common_audio/vad/)
- [Silero VAD](https://github.com/snakers4/silero-vad)
- [Pipecat Smart Turn](https://github.com/pipecat-ai/smart-turn)
- [LiveKit turn handling](https://docs.livekit.io/agents/logic/turns/)

This guide does not select a new production detector. Selection is an output of the evidence this project collects.
