# Fluid Full-Duplex Voice Design

**Date:** 2026-09-27  
**Status:** Proposed  
**Owners:** Mobile and API  
**Primary platforms:** iOS and Android, with physical-device validation led on iOS

## Problem

Memento voice mode connects to Gemini Live and can exchange audio, but the experience is not yet conversationally fluid. Users hear crackles, gaps, premature stops, delayed replies, overlapping speech, and apparent response restarts.

The current implementation combines microphone capture from `expo-audio`, playback from `react-native-audio-api`, and Gemini transport on the React Native JavaScript thread. This creates conflicting audio-session ownership and exposes playback directly to network and JavaScript scheduling jitter.

The current model is also duplicated between mobile and API as `gemini-2.5-flash-native-audio-preview-09-2025`, so an ephemeral token can constrain one model while the mobile client requests another after an upgrade.

## Goals

- Deliver clear, continuous generated speech without audible seams between Gemini chunks.
- Support true full-duplex behavior: capture remains active while model audio plays.
- Stop queued model audio promptly when the user interrupts.
- Begin a response roughly 600–1,200 ms after the user finishes under healthy network conditions.
- Preserve natural mid-sentence pauses without splitting one thought into multiple turns.
- Avoid speaker-to-microphone feedback on supported physical devices.
- Make model selection and voice configuration consistent between the API token and mobile session.
- Add enough instrumentation to distinguish capture, network, model, VAD, and playback latency.

## Non-goals

- Building a custom Swift/Kotlin WebSocket transport.
- Supporting background voice calls in the first release.
- Replacing Gemini Live with a cascaded speech-to-text, text model, and text-to-speech architecture.
- Adding call recording or retaining raw user audio.
- Promising identical acoustic behavior in iOS Simulator, where microphone routing and voice processing do not match a physical device.

## Root causes

### Conflicting audio-session ownership

Mobile currently calls `setAudioModeAsync` and then starts `expo-audio`'s `AudioStream`. On iOS, `AudioStream.start()` sets `AVAudioSession` to `.record` with `.measurement`, overriding the intended simultaneous recording and playback configuration. This is not a proper voice-call session and does not provide the desired full-duplex voice processing.

### JavaScript-scheduled chunk playback

Every Gemini PCM chunk is converted into a new `AudioBufferSourceNode` and scheduled independently with `nextPlaybackTimeRef`. Any JavaScript stall or late network packet can leave the hardware playback timeline empty, producing a click or gap. Finished sources also remain in an array until disconnect.

### Missing interruption handling

Gemini emits `serverContent.interrupted` when user speech interrupts generation. The mobile hook currently ignores it, allowing already-received audio to keep playing after the server has canceled the model turn.

### Untuned turn detection

The app relies on default server-side VAD. Default silence tolerance adds perceptible delay, while excessively aggressive values would split natural pauses and cause the reported stop/restart behavior.

### Model drift

The model name is hardcoded separately in mobile and API configuration. The configured September 2025 preview is no longer the preferred low-latency Live model. The stable `gemini-3.8-live` model is the current default choice for low-latency dialogue without reasoning delay.

### Missing observability

The app cannot currently report input chunk cadence, time to setup completion, time to first output audio, queue depth, underruns, interruption-to-silence time, or close reasons. Quality tuning therefore relies on subjective symptoms without identifying the responsible boundary.

## Architecture

### 1. One native audio owner

Use `react-native-audio-api` for both microphone capture and PCM playback. Remove `useAudioStream` and `setAudioModeAsync` from voice mode.

Create a session-scoped voice audio engine with:

- `AudioManager.setAudioSessionOptions` using iOS `playAndRecord` and `voiceChat`.
- `defaultToSpeaker` and `allowBluetoothHFP` routing options.
- `AudioManager.setAudioSessionActivity(true)` before capture or playback.
- One `AudioRecorder` for the lifetime of the connected session.
- A 16 kHz, mono, 1,600-frame callback window, yielding approximately 100 ms chunks.
- One 24 kHz `AudioContext` and one `AudioBufferQueueSourceNode` for model output.

Before enabling this engine, verify the installed native library exposes iOS voice processing and the Android voice-communication input preset. The current `react-native-audio-api` 0.13.x recorder API does not expose the newer explicit `iosVoiceProcessing` option. If a physical-device probe confirms voice processing is unavailable, upgrade to a compatible `react-native-audio-api` release that supports `new AudioRecorder({ iosVoiceProcessing: true, androidInputPreset: 'voiceCommunication' })`, rebuild the native projects, and make that configuration mandatory. Do not ship speaker-mode full duplex with software echo cancellation omitted silently.

The recorder callback converts float PCM to clipped signed 16-bit little-endian PCM, then base64-encodes and sends the chunk through Gemini realtime input. Conversion is isolated in pure utility functions with unit tests.

On disconnect, the engine removes the recorder callback, stops the recorder, clears and stops the playback queue, closes the context, and deactivates the audio session. Cleanup must be idempotent.

### 2. Native playback queue with bounded prebuffer

Gemini output remains 24 kHz mono signed 16-bit PCM. Each server chunk becomes an `AudioBuffer` and is enqueued on one native `AudioBufferQueueSourceNode`.

Playback starts after either:

- at least 120 ms of audio is queued, or
- 180 ms has elapsed since the first chunk arrived.

This small jitter buffer absorbs ordinary packet and JavaScript timing variation without making the conversation feel sluggish. Queue accounting tracks enqueued and completed durations. The target can later adapt within a bounded 80–240 ms range based on observed underruns, but the initial implementation uses fixed thresholds to keep behavior testable.

If the queue drains unexpectedly during an active model turn, record an underrun metric and re-enter prebuffering before restarting. Do not schedule dozens of independent source nodes.

### 3. Correct interruption behavior

When `serverContent.interrupted` is true:

- clear all queued model audio immediately;
- stop the current queue source;
- create a fresh queue source for subsequent output;
- reset prebuffer and speaking state;
- record interruption-to-silence latency.

The microphone remains active throughout. This preserves natural barge-in and prevents stale model speech from resuming after the user starts talking.

### 4. Turn detection

Phase one keeps Gemini automatic VAD and configures it explicitly:

- automatic activity detection enabled;
- `prefixPaddingMs`: 40;
- `silenceDurationMs`: 650;
- default sensitivity unless physical-device measurements show missed or false turns.

The 650 ms silence window is intentionally conservative enough for breathing and short thinking pauses while improving on the approximate default delay.

Phase two may add hybrid VAD: server-side start detection remains authoritative, while an on-device detector sends `audioStreamEnd` after a well-tested local end-of-speech event. Hybrid VAD must not ship until it has physical-device tests across quiet, noisy, speaker, and Bluetooth conditions because aggressive client-side end detection can clip or fragment speech.

### 5. Model and token contract

The API owns the Live model identifier. Upgrade development configuration and defaults to `gemini-3.8-live`.

The ephemeral-token response adds a `live` configuration object containing:

```ts
{
  model: string;
  voice: { id: string; name: string; provider: 'gemini' };
}
```

The token's `liveConnectConstraints.model` and returned `live.model` are generated from the same API configuration value. Mobile must request exactly the returned model and must not contain a fallback to an unrelated hardcoded model. If the field is absent during a staged rollout, mobile may use one temporary compatibility default matching the currently deployed API model; this fallback is removed after both environments have deployed the contract.

The existing React Native-specific `@google/genai/web` import remains.

### 6. Conversation configuration

The Live setup continues to request native audio responses and input/output transcription. Add a concise system instruction that defines Memento as a warm conversational companion and explicitly requests:

- brief spoken responses by default;
- no verbal markdown or long enumerations;
- natural acknowledgement before follow-up questions;
- no repeated greeting after interruption or reconnection;
- patience through short user pauses.

The existing explicit opening turn remains, but it is sent once only after setup is complete and the audio engine is ready.

### 7. Session state and transcript boundaries

Split transcript accumulation by completed turns rather than maintaining one ever-growing user string and one AI string. A turn-complete event commits the current user/model pair to the existing memory endpoint asynchronously. Persistence must never block capture, transport, or playback.

Interrupted model text is retained only to the extent Gemini marks it as delivered. Playback clearing does not invent or delete transcript content.

## Components

### Mobile

- `src/features/chat/voice-audio-engine.ts`
  - Owns `AudioManager`, `AudioRecorder`, `AudioContext`, and `AudioBufferQueueSourceNode`.
  - Exposes `start`, `enqueueOutput`, `interruptOutput`, `stop`, and diagnostic snapshots.
- `src/features/chat/pcm.ts`
  - Pure float/PCM16 and base64 conversions.
- `src/features/chat/voice-session-metrics.ts`
  - Development diagnostics and production-safe aggregate timing events without raw audio.
- `src/hooks/use-voice-mode.ts`
  - Owns Gemini session lifecycle and UI state.
  - Delegates all audio work to the engine.
  - Handles interruption and turn events.
- Contract and unit tests under `src/features/chat/`.

### API

- Live model configuration defaults and `.env.example`.
- Ephemeral-token service response and constraints.
- API tests proving returned model and constrained model are identical.

## Error handling

- Audio permission denial keeps the existing recovery alert.
- Audio-session activation failure stops setup and shows a reconnectable voice error.
- Recorder failure closes Gemini and audio resources exactly once.
- Gemini close/error clears playback immediately before updating UI.
- A malformed audio chunk is dropped and counted rather than terminating the call.
- A queue underrun is recoverable and triggers bounded rebuffering.
- App backgrounding ends the first-release voice session cleanly; foregrounding does not silently reconnect.
- Audio route changes are logged. If the platform invalidates the route, the session reconnects only through explicit user action in phase one.

## Instrumentation

Development logs and production-safe metrics include:

- connection start to WebSocket open;
- connection start to setup complete;
- user end-of-speech to first output chunk;
- first chunk to audible playback start;
- input chunk interval and size anomalies;
- playback queue depth in milliseconds;
- underrun count;
- Gemini interruption to local silence;
- audio route at session start and route-change count;
- session close code/reason and total duration.

No raw PCM, transcript text, ephemeral token, or user content is logged.

## Rollout

1. Add metrics around the current pipeline and establish a physical-device baseline.
2. Run a native compatibility probe for voice processing and upgrade `react-native-audio-api` if required.
3. Add pure PCM utilities and the native voice audio engine behind an internal feature flag.
4. Switch playback to the queue and implement interruption clearing.
5. Switch capture from `expo-audio` to `AudioRecorder` and enable the full-duplex audio session.
6. Deploy the API model-response contract and `gemini-3.8-live` configuration in development.
7. Enable the new mobile path in development and tune the fixed prebuffer/VAD values from measurements.
8. Run the device matrix and regression suite before production rollout.
9. Consider hybrid VAD only after the full-duplex baseline is stable.

## Testing

### Automated

- PCM conversion clamps correctly and preserves signed little-endian values.
- Recorder buffers are sent as 16 kHz mono PCM with expected 100 ms size.
- Playback does not start before prebuffer criteria.
- Sequential chunks are enqueued on one queue source.
- Queue underrun returns to prebuffering.
- `serverContent.interrupted` clears playback and speaking state.
- Disconnect cleanup is idempotent.
- Opening greeting is sent once after setup.
- Mobile uses the model returned by the token response.
- API token constraint and response expose the same model.

### Physical-device matrix

- iPhone speaker, receiver where supported, wired audio, and Bluetooth headset.
- Quiet room, normal room noise, and background speech.
- Wi-Fi, cellular, and simulated packet jitter.
- User interrupts early, midway, and near the end of model speech.
- Short answers, long monologues, natural pauses, and rapid back-and-forth.
- Lock/background, incoming call, route change, and Bluetooth disconnect.

The iOS Simulator remains a functional smoke test, not an acoustic-quality acceptance environment.

## Acceptance criteria

- No repeatable clicks or gaps in a five-minute healthy-network conversation.
- P95 first audible response under 1.2 seconds after detected end-of-speech in the development test environment.
- P95 interruption-to-silence under 150 ms.
- No stale audio resumes after an interruption.
- No more than one playback underrun per five-minute healthy-network conversation after initial buffering.
- Natural pauses of approximately 400 ms do not end a turn.
- Mobile and API report the same Live model for every connected session.
- No raw audio or sensitive conversation content appears in logs.

## Risks and mitigations

- **Echo cancellation varies by route and library version.** Validate on physical devices and upgrade `react-native-audio-api` only if the installed release cannot engage the required voice-processing path.
- **A model upgrade can change voices or event shapes.** Parse every content part, retain contract tests, and stage the model change in development.
- **A jitter buffer trades latency for continuity.** Begin with a small fixed target and tune from queue metrics, not subjective guesses.
- **VAD tuning can fragment speech.** Keep the first value conservative and defer hybrid VAD until baseline measurements exist.
- **Two repositories must deploy in order.** Make the token response backward-compatible for one rollout, deploy API first, then mobile, then remove the compatibility fallback.
