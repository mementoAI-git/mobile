# Making voice calls feel human — audit, 28 October 2026

Scope: mobile `9ba1ced` (dev) and api `706915f`, cross-checked against the earlier voice audits in this folder and against vendor documentation (sources at the end). Sentry returned 403 for org `memento-ai-pc` during this audit, so no claim here rests on production call data.

## Verdict

The model and the voice prompt are in good shape. What keeps calls from feeling human is the audio and turn-taking layer:

1. **Production cannot be interrupted on the loudspeaker.** `eas.json` ships production with `EXPO_PUBLIC_VOICE_FULL_DUPLEX=false` and no iOS voice processing, so mic frames are dropped while Memento talks (`voice-audio-engine.ts`, speaker gate).
2. **Where full duplex is on (TestFlight), five loudness heuristics decide whether the user is heard**: the greeting shield, a 300 ms learn-only window at the start of every reply, the echo gate's 2× margin over remembered echo, a rule that any interruption within 400 ms of Memento becoming audible is echo, and a one-strike fallback to half duplex. The fallback lasts at least 30 s, then 60 s, then 120 s, and after that rechecks until the leftover echo drops, so at high volume a call can stay deaf to interruptions for the rest of the call.
3. **Turns end on a fixed silence timer** (800 ms control, 450 ms arm; staging runs 450 ms for everyone). Nothing tells "finished" from "pausing mid-thought", or a backchannel ("mm-hmm") from taking the floor: any detected speech interrupts.

## Corrections to earlier assumptions

- **The iOS voice-processing freeze is fixed.** `c3ceb64` (11 Oct) patches `react-native-audio-api` to ignore engine configuration changes for one second after switching voice processing, breaking the main-thread loop behind 0x8BADF00D. TestFlight already runs with it on, and it reached `main` with #81 (17 Oct), so production builds contain it; only production's `eas.json` flags keep voice processing and full duplex off. What holds production back is self-interruption at full speaker volume (17 Oct report), not the freeze.
- **Playback is in the echo canceller's reference path.** On iOS the mic and playback share one `AVAudioEngine` (playback is an `AVAudioSourceNode` on its main mixer), and voice processing is enabled on that engine's input node.
- **Android echo cancellation is unverified, not known broken.** AOSP says capture with the voice-communication preset *should* include AEC; it does not document an output-usage requirement. We record with `voiceCommunication` and never set a voice-communication output usage or communication mode. Preview/TestFlight builds turn full duplex on for Android without device validation, and the server denylist (`VOICE_SPEAKER_DUPLEX_DENYLIST`) is empty by default.
- **`START_SENSITIVITY_LOW` is deliberate.** Gemini's default is HIGH; LOW "detects the start of speech less often", trading fewer false interruptions for harder real ones.

## Facts from vendor documentation that shape the fix

- **Apple's echo canceller needs ~200 ms to converge** (typically >20 dB suppression after that). Apple recommends ramping playback volume up over the first ~200 ms of the greeting.
- **Gemini hybrid VAD**: the server keeps detecting speech start; the client detects speech end and sends `audioStreamEnd`, which the server treats as "finalize now". It shortens the end-of-turn wait. It cannot ignore backchannels, because the server still owns speech start.
- **Gemini manual VAD**: disable automatic detection and send `activityStart`/`activityEnd`; `activityHandling` (default `START_OF_ACTIVITY_INTERRUPTS`) decides whether a start barges in. This is the only mode in which the app can decline to treat "mm-hmm" as an interruption. Forum reports describe sessions stalling after `activityEnd` (older model). LiveKit documents disabling Gemini's detection and using its own audio turn detector with `gemini-3.8-live`, which suggests the path works, but it needs a spike.
- **Smart Turn v3.2** (BSD-2): audio-only turn-end model, ~8M parameters, 8 MB int8 ONNX, 23 languages. Yoruba, Igbo, Hausa and Pidgin are not listed; our prompt explicitly supports code-switching into them.
- **`onnxruntime-react-native`** does not autolink on Expo SDK 57 (retired `unimodule.json`); running models inside our C++ module is the likelier route.
- **LiveKit's adaptive interruption** (backchannel vs barge-in) is not documented as working with Gemini Live's server-side detection, and is billed beyond a monthly allowance. A WebRTC move reliably buys the media layer, not turn-taking.

## Plan

1. **Measure first.** Restore Sentry access. Record labelled captures (below) across speakers, including Nigerian English and code-switching, at moderate and full volume, iPhone and two or three Android devices. Targets from the 11 Oct VAD audit: ≥95% of real interruptions heard; p95 interruption-to-silence <300 ms; <2% premature replies; end of speech to first audible word p50 <1 s, p95 <2 s.
2. **Fix iOS echo at the source.** Ramp the start of playback (done on this branch). Then use captures to decide whether the reply-onset window and the 400 ms rule can be relaxed. Needs real iPhones: the simulator uses the Mac's audio path.
3. **Validate Android** before full duplex ships there; add a voice-communication output usage only if AEC demonstrably fails to engage.
4. **Hybrid VAD** to shorten end-of-turn waits, behind a flag, judged on premature-reply rate.
5. **Manual-VAD spike** for backchannels and to replace the loudness heuristics with a trained speech detector plus turn model. Pass criteria: no session stalls, holds up on our accents, runs in the C++ module.
6. **Ship full duplex to production** (turn on `EXPO_PUBLIC_VOICE_IOS_VOICE_PROCESSING` and `EXPO_PUBLIC_VOICE_FULL_DUPLEX` in the production profile) once the replay numbers meet the targets.

This reorders the 17 Oct fix list: interruption comes before turn speed, because faster turns make cutoffs worse while Memento cannot be interrupted.

## Done on branch `voice/human-turn-taking`

- **Echo-canceller warm-up ramp** (`VoicePlaybackSession`, `warmupRampMs`): the first 200 ms of each playback session rises from silence to full level. Once per session (a call, or playback rebuilt for an output route with a new sample rate); later replies start at full level. Off by default in C++; the app requests 200 ms. Native tests in `tests/warmup_ramp_test.cpp`. Not yet measured on a device.
- **Gate capture and replay**:
  - `EXPO_PUBLIC_VOICE_DEBUG_CAPTURE=true` (development builds only) saves `voice-gate-<time>.wav` (raw mic, before any gating) and `.json` (frames where Memento was audible on the speaker, and the greeting shield) to the app's documents folder at hang-up.
  - Label the user's speech on the WAV in Audacity (label track, File > Export > Labels).
  - `bun run voice:replay voice-gate-<time>.json labels.txt` replays the capture through the echo gate with the engine's rules and reports interruptions heard, onset clipping, user speech passed, false openings per minute and leaked echo. `replayEchoGate` accepts any gate with the same `process()` signature, so a replacement can be scored on the same recordings.
  - Caveat: replay assumes full duplex. Captures from half-duplex calls without iOS voice processing (see `meta.voiceProcessingActive`) contain raw echo and are not representative of the full-duplex path.
- **Finding pinned by the replay tests**: if the user is already speaking when a reply starts, the 300 ms onset window learns their voice as echo, and the gate then misses the whole interruption.
- Stale comments about the freeze corrected in `voice-audio-policy.ts` and `.env.example`.

## Done on branch `voice/turn-taking-fixes`

- **A voice already talking when a reply starts carries on through it.** Clear speech (two frames) within 300 ms before Memento became audible keeps the mic open through the reply onset instead of being learned as echo; the self-interrupt guard then judges that early interruption by its words. Counted as `voice_echo_continuations`. Speech that starts at the same instant as the reply is still indistinguishable from echo by level. Not yet seen live: needs a device recording.
- **"Thinking…" follows Gemini, not mic level.** On two real simulator recordings, room sounds Gemini ignored looked exactly like soft speech by level (300–500 ms bursts several times above the floor). A noise-relative threshold did not help (7 false triggers either way in a quiet room, 1 → 3 under swelling noise) and was reverted. Thinking now needs Gemini's transcript of the user or a running tool: later, but never shown when nobody spoke.
- **Hybrid end of turn**, off by default (`EXPO_PUBLIC_VOICE_HYBRID_END_MS`). Reports `voice.hybrid_end_ms` and `voice_hybrid_turn_ends`. Its "the user spoke" signal is mic level, with the weakness above; choose the delay from recordings.

## What the simulator cannot test

- **Echo and interruption timing.** The simulator uses the Mac's microphone, speakers and echo canceller. With voice processing on, macOS cancels synthetic speech played through the same speakers (`say` reached the mic at ~0.017 instead of ~0.07), so overlap scenarios cannot be staged. Use a phone.
- **Fresh installs reset state** the rig depends on: microphone permission, the saved voice, and the dev menu's onboarding flag. Re-grant with `xcrun simctl privacy booted grant microphone io.mymemento.app` before trusting any mic result.

## Sources

- Gemini Live capabilities (VAD, hybrid VAD, audioStreamEnd): https://ai.google.dev/gemini-api/docs/live-api/capabilities
- Gemini Live WebSocket reference (ActivityHandling, sensitivities): https://ai.google.dev/api/live
- gemini-3.8-live model page: https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live
- Forum, manual VAD stall: https://discuss.ai.google.dev/t/gemini-2-5-flash-native-audio-preview-with-manual-vad-disabled-true-gemini-never-responds-after-activityend-session-dies-with-1011-keepalive-ping-timeout/141373/2
- Apple forums, AEC convergence and volume ramp: https://developer.apple.com/forums/thread/829784
- Android audio pre-processing: https://source.android.com/docs/core/audio/implement-pre-processing
- LiveKit Gemini turn detection: https://docs.livekit.io/agents/models/realtime/gemini
- LiveKit turn tuning: https://docs.livekit.io/agents/logic/turns/tuning/
- Smart Turn: https://github.com/pipecat-ai/smart-turn and https://huggingface.co/pipecat-ai/smart-turn-v3
- Micdrop, onnxruntime-react-native on Expo 57: https://micdrop.dev/docs/react-native/vad
