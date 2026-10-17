# Speaker interruptions and distorted playback — 2026-10-17

## Scope and confidence

Reported on TestFlight build 35: the assistant cuts itself off repeatedly at full speaker volume; lowering volume improves conversation. Some responses also become indistinct or sound like mumbling. The headphone difference is suspected, not confirmed. The exact device for this report remains unconfirmed (earlier testing was the iOS app on a Mac through TestFlight).

This review checks current source, including the speaker changes in `4d5521f` and concurrent working-tree changes. It does **not** establish which code shipped in build 35. No device audio or affected session trace was available. The defects below are reproduced in deterministic tests; they are not proof that every reported symptom is resolved.

## Fixed in this follow-up

### 1. An earlier barge-in could leave the next reply unfiltered

`src/features/chat/voice-echo-gate.ts` opens the mic for 1.5 seconds after speech confirmation, allowing softer words through. Previously, neither a non-gating frame nor a new calibration window cancelled that hold. If another reply started before expiry, its echo could pass directly to Gemini—even after reply-onset calibration had measured it correctly.

The hold now clears when gating stops or calibration begins. The measured echo level is retained, and speech still passes freely when the assistant is not audible. Existing tests continue to cover softer speech during an uninterrupted hold and pre-roll preservation.

Two new regressions failed before the fix and pass afterward:

- A user interruption followed by a quiet interval and a quick new reply.
- New calibration followed by echo before the earlier hold expires.

This does not make loudness a reliable speech/echo classifier. Nor does it guarantee that every playback transition triggers calibration: `audibleSince` tracks audibility, including hangover/recovery, rather than an explicit new-turn boundary.

### 2. Bundled user transcripts arrived too late for interruption classification

`src/features/chat/voice-message-handler.ts` emitted audio before input transcription within the same server message. The hook judges a pending interruption as soon as new audio arrives. It could therefore classify a real user interruption as empty input/echo, despite that message containing the user's words. The current one-suspect fallback policy makes this particularly disruptive.

The handler now delivers input transcription before audio, while keeping `interrupted` first and the new output transcription after audio. That last ordering prevents the new answer's words from contaminating comparison against the interrupted answer.

Two behavioral regressions exercise the real handler and guard with bundled final and interim transcripts. Both falsely suspected echo before the fix and pass afterward. This addresses within-message ordering; a transcript arriving in a later, separate network message remains a limitation of immediate classification.

## Mumbling: plausible mechanisms, not confirmed causes

In `modules/react-native-memento-voice/common/cpp/mementovoice/VoicePlaybackSession.cpp`, `startConcealment()` repeats an estimated pitch period when playback runs out of samples. The default limit is 60 ms per gap. Repeated gaps could sound stretched or robotic. The pitch search picks the best available correlation without requiring a minimum quality score, so noisy or unvoiced tails can also be repeated. These source facts do not prove that concealment caused the reported sound.

The native playback buffer also has a five-second cap and overflow paths that discard audio. A deletion could remove part of a word or sentence. Native snapshots expose overflow/drop counters, but `NativeVoicePlaybackController.getStats()` does not currently carry them into the call report. `droppedFrames` also counts intentionally discarded output, so it must not be treated as an overflow-only metric.

The current workspace already includes `concealedMs`, `underrunsWaitingForAudio`, `underrunsWithAudio`, `maxChunkGapMs`, and `maxJsStallMs` telemetry. These help prioritize investigation, but aggregate call totals and maxima do not establish event-by-event causality. This follow-up does not change concealment, buffering thresholds, or native audio processing without a reproduction.

## Remaining speaker risks

- Loudness gating can mistake loud residual echo for speech and reject a quiet user. A sudden volume increase mid-reply is especially important to test; reply-onset calibration cannot pre-measure it.
- The current guard treats interruptions within 400 ms of becoming audible as echo. A user can already be speaking or intentionally interrupt immediately; timing alone is not proof of echo. Measure false fallbacks as well as suppressed self-interruptions.
- Calibration assumes captured audio is mostly echo. A user speaking during calibration can raise the learned threshold and make later interruptions harder.
- A half-duplex fallback prevents voice barge-in while the assistant speaks. A stable call in that state is a mitigation, not evidence of natural full-duplex conversation.

## Device validation for the next build

Record the build, OS/device, output route, session identifier, and approximate symptom time. Run the same short conversation at moderate and maximum volume, then with headphones. Include a volume increase during an answer, silent listening, a normal interruption, an immediate interruption, and a quiet interruption after a loud reply. Repeat each condition; one successful conversation is insufficient.

Observe:

1. Silent listening should not cause interruption events or repeated answer restarts.
2. Real interruptions should stop playback promptly and preserve the first word. Track whether the call falls back and whether full duplex returns.
3. Correlate distorted playback with concealment, underrun, chunk-gap, and JS-stall measurements. Count overflow separately from intentional interruption drops.
4. In an explicitly enabled local debug session, compare received PCM with rendered PCM and what is heard through the speaker. If received audio is already distorted, investigate model/session input; if only rendering is distorted, investigate playback; if digital rendering is clean but the speaker is not, investigate the device audio path. Do not add routine raw-audio or transcript logging to production telemetry.

Acceptance requires testing the affected route on real hardware. Unit tests cannot validate acoustic echo cancellation, speaker distortion, or perceived speech quality.

## Verification

- Four new regressions failed for the expected reasons before production changes.
- Focused gate, message-handler, audio-engine, and interruption-guard run: **81 passed, 0 failed**.
- Full `bun run test`: **1,058 passed, 0 failed** across 216 files.
- `bun run typecheck`: **failed** with TS2554 (missing second arguments) in `voice-call-actions.test.ts` and `voice-control/tools.test.ts`. Those files are outside this patch; the workspace contains concurrent voice-tool changes. Do not treat this as a clean release build.
- No native code changed in this follow-up. No device playback validation or new TestFlight build was performed.
