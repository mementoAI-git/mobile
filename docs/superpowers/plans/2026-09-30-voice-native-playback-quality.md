# Native Playback Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make model speech hold up on bad networks, the way WebRTC's jitter buffer and packet loss concealment do. The buffer grows only after gaps actually happen, and short gaps are filled with a fading continuation of the last sound instead of silence.

**Architecture:** All changes live in the C++ `VoicePlaybackSession` render path, which runs on the audio thread and owns every output sample. The **adaptive buffer** adds an extra startup and recovery target of 120 ms after each underrun, capped at 360 ms, and gives 60 ms back after each clean minute. **Concealment** works on an underrun mid-turn: it estimates the pitch period of the last 10 ms of real output by normalized autocorrelation, then repeats that period with a linear fade to zero over at most 60 ms. When real audio returns it crossfades out over 5 ms. Interrupts and turn ends are never concealed. The existing 5 ms de-click fades still apply everywhere else. Stats flow to the call's session metrics log.

**Tech Stack:** C++20 (clang, standalone test harness), JSI host object, TypeScript, Bun test.

**Strategy:** `api/docs/superpowers/specs/2026-09-30-voice-experience-strategy.md`, Phase 1c.

## Global Constraints

- **Prerequisites:** `docs/superpowers/plans/2026-09-30-voice-stopgaps.md` Tasks 4 and 5 are merged: the de-click fades, `bun run test:native-voice`, and the native buffer constants. `docs/superpowers/plans/2026-09-30-voice-phase1c-mobile.md` is merged.
- The render path must stay real-time safe. No allocation, locks, logging or exceptions in `render`, `finishRender`, `startConcealment` or `nextConcealSample`. The only arrays are fixed `std::array` members, and one fixed `std::array` on the stack in `startConcealment`.
- **How to apply edits.** "In `<file>`, find:" plus a code block, then "Replace it with:" plus a code block. The find text appears exactly once. Copy exactly. "Replace the whole of `<file>` with:" overwrites a file. If a find text is missing, stop and report.
- Every edit was replayed in order on 2026-09-30 against this repo with the prerequisites applied. `bun run test:native-voice`, typecheck and `bun test` pass after every task.

## File Structure

| File | Responsibility |
| --- | --- |
| Modify `modules/react-native-memento-voice/common/cpp/mementovoice/VoicePlaybackSession.h` | Options, snapshot fields, render-thread state |
| Modify `modules/react-native-memento-voice/common/cpp/mementovoice/VoicePlaybackSession.cpp` | Adaptive thresholds, concealment, final render pass |
| Create `modules/react-native-memento-voice/common/cpp/tests/playback_quality_test.cpp` | Standalone tests |
| Modify `modules/react-native-memento-voice/common/cpp/mementovoice/VoiceSessionHostObject.cpp` | Expose new snapshot fields to JS |
| Modify `modules/react-native-memento-voice/src/index.ts` | Snapshot type |
| Modify `src/features/chat/native-voice-playback-controller.ts`, `src/features/chat/voice-audio-engine.ts` | Carry the stats into the session metrics log |
| Modify `package.json` | Run both native test files |

---

### Task 1: Adaptive jitter buffer

**Files:**
- Modify: `VoicePlaybackSession.h`, `VoicePlaybackSession.cpp`
- Create: `modules/react-native-memento-voice/common/cpp/tests/playback_quality_test.cpp`
- Modify: `package.json`

**Interfaces:**
- Produces: `PlaybackOptions.adaptiveStepMs`, `maxAdaptiveExtraMs`, `adaptiveRelaxAfterMs`, `adaptiveRelaxStepMs`, and `PlaybackSnapshot.adaptiveExtraMs`

- [ ] **Step 1: Write the failing test**

Create `modules/react-native-memento-voice/common/cpp/tests/playback_quality_test.cpp`:

```cpp
#include "mementovoice/VoicePlaybackSession.h"

#include <chrono>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <string>
#include <thread>
#include <vector>

using namespace mementovoice;

namespace {

constexpr double kPi = 3.14159265358979323846;

std::string base64(const std::vector<uint8_t> &bytes) {
  static const char *alphabet =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  std::string out;
  size_t i = 0;
  for (; i + 2 < bytes.size(); i += 3) {
    const uint32_t n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += alphabet[(n >> 18) & 63];
    out += alphabet[(n >> 12) & 63];
    out += alphabet[(n >> 6) & 63];
    out += alphabet[n & 63];
  }
  if (i + 1 == bytes.size()) {
    const uint32_t n = bytes[i] << 16;
    out += alphabet[(n >> 18) & 63];
    out += alphabet[(n >> 12) & 63];
    out += "==";
  } else if (i + 2 == bytes.size()) {
    const uint32_t n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += alphabet[(n >> 18) & 63];
    out += alphabet[(n >> 12) & 63];
    out += alphabet[(n >> 6) & 63];
    out += '=';
  }
  return out;
}

// 24 kHz PCM16 sine, continuing phase from `startFrame`.
std::string sinePcm(double hz, float amplitude, size_t startFrame, size_t frames) {
  std::vector<uint8_t> bytes;
  for (size_t i = 0; i < frames; ++i) {
    const double t = static_cast<double>(startFrame + i) / 24000.0;
    const auto sample = static_cast<int16_t>(amplitude * 32767.0 * std::sin(2.0 * kPi * hz * t));
    bytes.push_back(static_cast<uint8_t>(sample & 0xff));
    bytes.push_back(static_cast<uint8_t>((sample >> 8) & 0xff));
  }
  return base64(bytes);
}

PlaybackOptions options(uint32_t maxAdaptiveExtraMs, uint32_t relaxAfterMs = 60000) {
  PlaybackOptions value;
  value.sourceSampleRate = 24000;
  value.targetSampleRate = 48000;
  value.startupBufferMs = 20;
  value.recoveryBufferMs = 20;
  value.maxBufferedMs = 5000;
  value.adaptiveStepMs = 120;
  value.maxAdaptiveExtraMs = maxAdaptiveExtraMs;
  value.adaptiveRelaxAfterMs = relaxAfterMs;
  value.adaptiveRelaxStepMs = 60;
  return value;
}

void waitForBuffered(VoicePlaybackSession &session, double ms) {
  for (int i = 0; i < 2000 && session.snapshot().bufferedMs < ms; ++i) {
    std::this_thread::sleep_for(std::chrono::milliseconds(1));
  }
}

void render(VoicePlaybackSession &session, size_t frames, std::vector<float> &out) {
  float buffer[128];
  for (size_t done = 0; done < frames; done += 128) {
    session.render(buffer, 128);
    out.insert(out.end(), buffer, buffer + 128);
  }
}

int failures = 0;

void expect(bool ok, const char *name, double value) {
  std::printf("%s %s (%.4f)\n", ok ? "PASS" : "FAIL", name, value);
  if (!ok) ++failures;
}

}  // namespace

int main() {
  {
    VoicePlaybackSession session(options(360, 1000));
    session.start(1, 1);
    size_t sequence = 0;
    for (int underrun = 1; underrun <= 4; ++underrun) {
      // Playback restarts once recovery (20 ms) plus the adaptive extra is buffered.
      const size_t neededMs = 20 + std::min(360, (underrun - 1) * 120);
      const size_t pushMs = neededMs + 50;
      session.pushPCM(sinePcm(200.0, 0.5f, 0, pushMs * 24), 1, 1, sequence++);
      waitForBuffered(session, static_cast<double>(pushMs) - 5.0);
      std::vector<float> out;
      render(session, 48000, out);  // 1 s: plays everything, then underruns
    }
    expect(session.snapshot().adaptiveExtraMs == 360,
           "each underrun adds 120 ms, capped at 360 ms", session.snapshot().adaptiveExtraMs);

    // 1.2 s of clean playback relaxes the extra buffer by one 60 ms step.
    session.pushPCM(sinePcm(200.0, 0.5f, 0, 24000), 1, 1, sequence++);  // 1 s
    waitForBuffered(session, 950.0);
    std::vector<float> out;
    render(session, 38400, out);  // 800 ms
    session.pushPCM(sinePcm(200.0, 0.5f, 24000, 24000), 1, 1, sequence++);
    waitForBuffered(session, 1000.0);
    render(session, 19200, out);  // 400 ms more, still no underrun
    expect(session.snapshot().adaptiveExtraMs == 300,
           "a clean stretch relaxes the extra buffer by 60 ms", session.snapshot().adaptiveExtraMs);
    session.stop(1);
  }
  return failures == 0 ? 0 : 1;
}
```

In `package.json`, find:

```json
    "test:native-voice": "mkdir -p .native-test && clang++ -std=c++20 -O1 -pthread -Wall -I modules/react-native-memento-voice/common/cpp modules/react-native-memento-voice/common/cpp/mementovoice/VoicePlaybackSession.cpp modules/react-native-memento-voice/common/cpp/tests/declick_test.cpp -o .native-test/declick_test && ./.native-test/declick_test",
```

Replace it with:

```json
    "test:native-voice": "mkdir -p .native-test && clang++ -std=c++20 -O1 -pthread -Wall -I modules/react-native-memento-voice/common/cpp modules/react-native-memento-voice/common/cpp/mementovoice/VoicePlaybackSession.cpp modules/react-native-memento-voice/common/cpp/tests/declick_test.cpp -o .native-test/declick_test && ./.native-test/declick_test && clang++ -std=c++20 -O1 -pthread -Wall -I modules/react-native-memento-voice/common/cpp modules/react-native-memento-voice/common/cpp/mementovoice/VoicePlaybackSession.cpp modules/react-native-memento-voice/common/cpp/tests/playback_quality_test.cpp -o .native-test/playback_quality_test && ./.native-test/playback_quality_test",
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test:native-voice`
Expected: the declick tests pass, then compilation of `playback_quality_test.cpp` FAILS with "no member named 'adaptiveStepMs'".

- [ ] **Step 3: Add the options, snapshot field and state**

In `modules/react-native-memento-voice/common/cpp/mementovoice/VoicePlaybackSession.h`, find:

```cpp
  uint32_t maxBufferedMs = 5000;
};
```

Replace it with:

```cpp
  uint32_t maxBufferedMs = 5000;
  // Adaptive jitter buffer: extra startup and recovery buffer added after each
  // underrun, capped, and slowly relaxed after a clean stretch of playback.
  uint32_t adaptiveStepMs = 120;
  uint32_t maxAdaptiveExtraMs = 360;
  uint32_t adaptiveRelaxAfterMs = 60000;
  uint32_t adaptiveRelaxStepMs = 60;
};
```

In `modules/react-native-memento-voice/common/cpp/mementovoice/VoicePlaybackSession.h`, find:

```cpp
  bool isAudible;
};
```

Replace it with:

```cpp
  bool isAudible;
  uint32_t adaptiveExtraMs;
};
```

In `modules/react-native-memento-voice/common/cpp/mementovoice/VoicePlaybackSession.h`, find:

```cpp
  void applyDeclick(float *output, size_t written, size_t frameCount) noexcept;
```

Replace it with:

```cpp
  void applyDeclick(float *output, size_t written, size_t frameCount) noexcept;
  void noteUnderrun() noexcept;
  void noteRenderedFrames(size_t frames) noexcept;
```

In `modules/react-native-memento-voice/common/cpp/mementovoice/VoicePlaybackSession.h`, find:

```cpp
  bool outputWasSilent_ = true;
```

Replace it with:

```cpp
  bool outputWasSilent_ = true;
  // Render-thread-only adaptive buffer state.
  uint32_t adaptiveExtraMs_ = 0;
  uint64_t framesSinceUnderrun_ = 0;
```

In `modules/react-native-memento-voice/common/cpp/mementovoice/VoicePlaybackSession.h`, find:

```cpp
  std::atomic<uint64_t> malformedChunkCount_{0};
```

Replace it with:

```cpp
  std::atomic<uint64_t> malformedChunkCount_{0};
  std::atomic<uint32_t> adaptiveExtraSnapshot_{0};
```

- [ ] **Step 4: Use the adaptive thresholds**

In `modules/react-native-memento-voice/common/cpp/mementovoice/VoicePlaybackSession.cpp`, find:

```cpp
  if (state == PlaybackState::Priming && available >= thresholdFrames(options_.startupBufferMs)) {
```

Replace it with:

```cpp
  if (state == PlaybackState::Priming &&
      available >= thresholdFrames(options_.startupBufferMs + adaptiveExtraMs_)) {
```

In `modules/react-native-memento-voice/common/cpp/mementovoice/VoicePlaybackSession.cpp`, find:

```cpp
             available >= thresholdFrames(options_.recoveryBufferMs)) {
```

Replace it with:

```cpp
             available >= thresholdFrames(options_.recoveryBufferMs + adaptiveExtraMs_)) {
```

In `modules/react-native-memento-voice/common/cpp/mementovoice/VoicePlaybackSession.cpp`, find:

```cpp
      underrunCount_.fetch_add(1, std::memory_order_relaxed);
      state_.store(PlaybackState::Recovering, std::memory_order_release);
```

Replace it with:

```cpp
      underrunCount_.fetch_add(1, std::memory_order_relaxed);
      state_.store(PlaybackState::Recovering, std::memory_order_release);
      noteUnderrun();
```

In `modules/react-native-memento-voice/common/cpp/mementovoice/VoicePlaybackSession.cpp`, find:

```cpp
  applyDeclick(output, written, frameCount);
  return written;
```

Replace it with:

```cpp
  if (written > 0) noteRenderedFrames(written);
  applyDeclick(output, written, frameCount);
  return written;
```

In `modules/react-native-memento-voice/common/cpp/mementovoice/VoicePlaybackSession.cpp`, find:

```cpp
PlaybackSnapshot VoicePlaybackSession::snapshot() const noexcept {
```

Replace it with:

```cpp
void VoicePlaybackSession::noteUnderrun() noexcept {
  adaptiveExtraMs_ = std::min(
      options_.maxAdaptiveExtraMs, adaptiveExtraMs_ + options_.adaptiveStepMs);
  framesSinceUnderrun_ = 0;
  adaptiveExtraSnapshot_.store(adaptiveExtraMs_, std::memory_order_relaxed);
}

void VoicePlaybackSession::noteRenderedFrames(size_t frames) noexcept {
  if (adaptiveExtraMs_ == 0) return;
  framesSinceUnderrun_ += frames;
  if (framesSinceUnderrun_ < thresholdFrames(options_.adaptiveRelaxAfterMs)) return;
  adaptiveExtraMs_ -= std::min(adaptiveExtraMs_, options_.adaptiveRelaxStepMs);
  framesSinceUnderrun_ = 0;
  adaptiveExtraSnapshot_.store(adaptiveExtraMs_, std::memory_order_relaxed);
}

PlaybackSnapshot VoicePlaybackSession::snapshot() const noexcept {
```

In `modules/react-native-memento-voice/common/cpp/mementovoice/VoicePlaybackSession.cpp`, find:

```cpp
      state == PlaybackState::Playing || state == PlaybackState::Draining};
```

Replace it with:

```cpp
      state == PlaybackState::Playing || state == PlaybackState::Draining,
      adaptiveExtraSnapshot_.load(std::memory_order_relaxed)};
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `bun run test:native-voice`
Expected:

```
PASS underrun fades out instead of stepping to silence (max step 0.0053)
PASS interrupt decays instead of cutting mid-waveform (max step 0.0039)
PASS playback start fades in from silence (max step 0.0039)
PASS each underrun adds 120 ms, capped at 360 ms (360.0000)
PASS a clean stretch relaxes the extra buffer by 60 ms (300.0000)
```

- [ ] **Step 6: Commit**

```bash
git add modules/react-native-memento-voice/common/cpp package.json
git commit -m "feat(voice): adaptive native jitter buffer"
```

---

### Task 2: Packet loss concealment

**Files:**
- Modify: `VoicePlaybackSession.h`, `VoicePlaybackSession.cpp`
- Modify: `modules/react-native-memento-voice/common/cpp/tests/playback_quality_test.cpp`

**Interfaces:**
- Produces: `PlaybackOptions.concealMaxMs` (default 60) and `PlaybackSnapshot.concealedFrames`. `applyDeclick` is replaced by `finishRender(output, written, frameCount, conceal)`.

- [ ] **Step 1: Write the failing tests**

Replace the whole of `modules/react-native-memento-voice/common/cpp/tests/playback_quality_test.cpp` with:

```cpp
#include "mementovoice/VoicePlaybackSession.h"

#include <chrono>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <string>
#include <thread>
#include <vector>

using namespace mementovoice;

namespace {

constexpr double kPi = 3.14159265358979323846;

std::string base64(const std::vector<uint8_t> &bytes) {
  static const char *alphabet =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  std::string out;
  size_t i = 0;
  for (; i + 2 < bytes.size(); i += 3) {
    const uint32_t n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += alphabet[(n >> 18) & 63];
    out += alphabet[(n >> 12) & 63];
    out += alphabet[(n >> 6) & 63];
    out += alphabet[n & 63];
  }
  if (i + 1 == bytes.size()) {
    const uint32_t n = bytes[i] << 16;
    out += alphabet[(n >> 18) & 63];
    out += alphabet[(n >> 12) & 63];
    out += "==";
  } else if (i + 2 == bytes.size()) {
    const uint32_t n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += alphabet[(n >> 18) & 63];
    out += alphabet[(n >> 12) & 63];
    out += alphabet[(n >> 6) & 63];
    out += '=';
  }
  return out;
}

// 24 kHz PCM16 sine, continuing phase from `startFrame`.
std::string sinePcm(double hz, float amplitude, size_t startFrame, size_t frames) {
  std::vector<uint8_t> bytes;
  for (size_t i = 0; i < frames; ++i) {
    const double t = static_cast<double>(startFrame + i) / 24000.0;
    const auto sample = static_cast<int16_t>(amplitude * 32767.0 * std::sin(2.0 * kPi * hz * t));
    bytes.push_back(static_cast<uint8_t>(sample & 0xff));
    bytes.push_back(static_cast<uint8_t>((sample >> 8) & 0xff));
  }
  return base64(bytes);
}

PlaybackOptions options(uint32_t maxAdaptiveExtraMs, uint32_t relaxAfterMs = 60000) {
  PlaybackOptions value;
  value.sourceSampleRate = 24000;
  value.targetSampleRate = 48000;
  value.startupBufferMs = 20;
  value.recoveryBufferMs = 20;
  value.maxBufferedMs = 5000;
  value.adaptiveStepMs = 120;
  value.maxAdaptiveExtraMs = maxAdaptiveExtraMs;
  value.adaptiveRelaxAfterMs = relaxAfterMs;
  value.adaptiveRelaxStepMs = 60;
  value.concealMaxMs = 60;
  return value;
}

void waitForBuffered(VoicePlaybackSession &session, double ms) {
  for (int i = 0; i < 2000 && session.snapshot().bufferedMs < ms; ++i) {
    std::this_thread::sleep_for(std::chrono::milliseconds(1));
  }
}

void render(VoicePlaybackSession &session, size_t frames, std::vector<float> &out) {
  float buffer[128];
  for (size_t done = 0; done < frames; done += 128) {
    session.render(buffer, 128);
    out.insert(out.end(), buffer, buffer + 128);
  }
}

float maxStep(const std::vector<float> &s, size_t from = 1) {
  float worst = 0.0f;
  for (size_t i = std::max<size_t>(from, 1); i < s.size(); ++i) {
    worst = std::max(worst, std::fabs(s[i] - s[i - 1]));
  }
  return worst;
}

float rms(const std::vector<float> &s, size_t from, size_t to) {
  double sum = 0.0;
  for (size_t i = from; i < to && i < s.size(); ++i) sum += static_cast<double>(s[i]) * s[i];
  return static_cast<float>(std::sqrt(sum / static_cast<double>(std::max<size_t>(1, to - from))));
}

int failures = 0;

void expect(bool ok, const char *name, double value) {
  std::printf("%s %s (%.4f)\n", ok ? "PASS" : "FAIL", name, value);
  if (!ok) ++failures;
}

}  // namespace

int main() {
  // A 200 Hz sine changes by at most ~0.013 per 48 kHz sample at amplitude 0.5.
  {
    VoicePlaybackSession session(options(0));
    session.start(1, 1);
    session.pushPCM(sinePcm(200.0, 0.5f, 0, 2400), 1, 1, 0);  // 100 ms, turn open
    waitForBuffered(session, 95.0);
    std::vector<float> out{0.0f};
    render(session, 4800 + 9600, out);  // 100 ms of audio, then 200 ms of gap
    const size_t gapStart = 1 + 4800;
    expect(maxStep(out) < 0.03f, "concealment continues the waveform without clicks", maxStep(out));
    expect(rms(out, gapStart, gapStart + 960) > 0.15f,
           "first 20 ms of the gap is concealed, not silent", rms(out, gapStart, gapStart + 960));
    expect(rms(out, gapStart + 3456, out.size()) == 0.0f,
           "silence after the 60 ms concealment budget", rms(out, gapStart + 3456, out.size()));
    expect(session.snapshot().concealedFrames >= 2800,
           "snapshot reports concealed frames", static_cast<double>(session.snapshot().concealedFrames));
    session.stop(1);
  }
  {
    VoicePlaybackSession session(options(0));
    session.start(1, 1);
    session.pushPCM(sinePcm(200.0, 0.5f, 0, 2400), 1, 1, 0);
    waitForBuffered(session, 95.0);
    std::vector<float> out{0.0f};
    render(session, 4800 + 1280, out);  // into the concealment
    session.pushPCM(sinePcm(310.0, 0.5f, 0, 2400), 1, 1, 1);  // different pitch and phase
    waitForBuffered(session, 95.0);
    render(session, 4800, out);
    expect(maxStep(out) < 0.05f, "resumed audio crossfades out of the concealment", maxStep(out));
    session.stop(1);
  }
  {
    VoicePlaybackSession session(options(0));
    session.start(1, 1);
    session.pushPCM(sinePcm(200.0, 0.5f, 0, 4800), 1, 1, 0);
    waitForBuffered(session, 190.0);
    std::vector<float> out{0.0f};
    render(session, 1280, out);
    session.interrupt(1, 2);
    const size_t afterInterrupt = out.size();
    render(session, 2560, out);
    expect(rms(out, afterInterrupt + 256, out.size()) == 0.0f,
           "interrupt is not concealed", rms(out, afterInterrupt + 256, out.size()));
    expect(maxStep(out) < 0.03f, "interrupt still decays smoothly", maxStep(out));
    session.stop(1);
  }
  {
    VoicePlaybackSession session(options(360, 1000));
    session.start(1, 1);
    size_t sequence = 0;
    for (int underrun = 1; underrun <= 4; ++underrun) {
      // Playback restarts once recovery (20 ms) plus the adaptive extra is buffered.
      const size_t neededMs = 20 + std::min(360, (underrun - 1) * 120);
      const size_t pushMs = neededMs + 50;
      session.pushPCM(sinePcm(200.0, 0.5f, 0, pushMs * 24), 1, 1, sequence++);
      waitForBuffered(session, static_cast<double>(pushMs) - 5.0);
      std::vector<float> out;
      render(session, 48000, out);  // 1 s: plays everything, then underruns
    }
    expect(session.snapshot().adaptiveExtraMs == 360,
           "each underrun adds 120 ms, capped at 360 ms", session.snapshot().adaptiveExtraMs);

    // 1.2 s of clean playback relaxes the extra buffer by one 60 ms step.
    session.pushPCM(sinePcm(200.0, 0.5f, 0, 24000), 1, 1, sequence++);  // 1 s
    waitForBuffered(session, 950.0);
    std::vector<float> out;
    render(session, 38400, out);  // 800 ms
    session.pushPCM(sinePcm(200.0, 0.5f, 24000, 24000), 1, 1, sequence++);
    waitForBuffered(session, 1000.0);
    render(session, 19200, out);  // 400 ms more, still no underrun
    expect(session.snapshot().adaptiveExtraMs == 300,
           "a clean stretch relaxes the extra buffer by 60 ms", session.snapshot().adaptiveExtraMs);
    session.stop(1);
  }
  return failures == 0 ? 0 : 1;
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun run test:native-voice`
Expected: compilation FAILS with "no member named 'concealMaxMs'".

- [ ] **Step 3: Add the options, snapshot field and state**

In `modules/react-native-memento-voice/common/cpp/mementovoice/VoicePlaybackSession.h`, find:

```cpp
  uint32_t adaptiveRelaxStepMs = 60;
};
```

Replace it with:

```cpp
  uint32_t adaptiveRelaxStepMs = 60;
  // Packet loss concealment: how long to extend the last sound on an underrun.
  uint32_t concealMaxMs = 60;
};
```

In `modules/react-native-memento-voice/common/cpp/mementovoice/VoicePlaybackSession.h`, find:

```cpp
  uint32_t adaptiveExtraMs;
};
```

Replace it with:

```cpp
  uint32_t adaptiveExtraMs;
  uint64_t concealedFrames;
};
```

In `modules/react-native-memento-voice/common/cpp/mementovoice/VoicePlaybackSession.h`, find:

```cpp
  static constexpr size_t kFadeFrames = 240;
```

Replace it with:

```cpp
  static constexpr size_t kFadeFrames = 240;
  // Enough recent output for a 10 ms window plus a 70 Hz pitch lag at 48 kHz.
  static constexpr size_t kHistoryFrames = 2048;
```

In `modules/react-native-memento-voice/common/cpp/mementovoice/VoicePlaybackSession.h`, find:

```cpp
  void applyDeclick(float *output, size_t written, size_t frameCount) noexcept;
```

Replace it with:

```cpp
  void finishRender(float *output, size_t written, size_t frameCount, bool conceal) noexcept;
  void pushHistory(const float *samples, size_t count) noexcept;
  bool startConcealment() noexcept;
  float nextConcealSample() noexcept;
  void resetConcealment() noexcept;
```

In `modules/react-native-memento-voice/common/cpp/mementovoice/VoicePlaybackSession.h`, find:

```cpp
  // Render-thread-only adaptive buffer state.
```

Replace it with:

```cpp
  // Render-thread-only concealment state.
  std::array<float, kHistoryFrames> history_{};
  size_t historyWrite_ = 0;
  size_t historyCount_ = 0;
  uint64_t historyEpoch_ = 0;
  std::array<float, kHistoryFrames> concealTemplate_{};
  size_t concealPeriod_ = 0;
  size_t concealPos_ = 0;
  size_t concealRemaining_ = 0;
  size_t concealTotal_ = 0;
  bool concealUsedForGap_ = false;
  // Render-thread-only adaptive buffer state.
```

In `modules/react-native-memento-voice/common/cpp/mementovoice/VoicePlaybackSession.h`, find:

```cpp
  std::atomic<uint32_t> adaptiveExtraSnapshot_{0};
```

Replace it with:

```cpp
  std::atomic<uint32_t> adaptiveExtraSnapshot_{0};
  std::atomic<uint64_t> concealedFrames_{0};
```

- [ ] **Step 4: Conceal in the render path**

In `modules/react-native-memento-voice/common/cpp/mementovoice/VoicePlaybackSession.cpp`, find:

```cpp
  const uint64_t activeEpoch = epoch_.load(std::memory_order_acquire);
  while (true) {
```

Replace it with:

```cpp
  const uint64_t activeEpoch = epoch_.load(std::memory_order_acquire);
  if (activeEpoch != historyEpoch_) {
    // New turn after an interrupt: never conceal with the old turn's voice.
    historyEpoch_ = activeEpoch;
    historyCount_ = 0;
    historyWrite_ = 0;
    resetConcealment();
  }
  while (true) {
```

In `modules/react-native-memento-voice/common/cpp/mementovoice/VoicePlaybackSession.cpp`, find:

```cpp
    applyDeclick(output, 0, frameCount);
    return 0;
```

Replace it with:

```cpp
    // While rebuffering mid-turn, keep extending the last sound.
    finishRender(output, 0, frameCount, state == PlaybackState::Recovering);
    return 0;
```

In `modules/react-native-memento-voice/common/cpp/mementovoice/VoicePlaybackSession.cpp`, find:

```cpp
  if (written < frameCount) {
    if (turnOpen_.load(std::memory_order_acquire)) {
      underrunCount_.fetch_add(1, std::memory_order_relaxed);
      state_.store(PlaybackState::Recovering, std::memory_order_release);
      noteUnderrun();
    } else {
      state_.store(PlaybackState::Idle, std::memory_order_release);
    }
  }
  if (written > 0) noteRenderedFrames(written);
  applyDeclick(output, written, frameCount);
  return written;
```

Replace it with:

```cpp
  bool conceal = false;
  if (written < frameCount) {
    if (turnOpen_.load(std::memory_order_acquire)) {
      underrunCount_.fetch_add(1, std::memory_order_relaxed);
      state_.store(PlaybackState::Recovering, std::memory_order_release);
      noteUnderrun();
      conceal = true;
    } else {
      state_.store(PlaybackState::Idle, std::memory_order_release);
    }
  }
  if (written > 0) noteRenderedFrames(written);
  finishRender(output, written, frameCount, conceal);
  return written;
```

In `modules/react-native-memento-voice/common/cpp/mementovoice/VoicePlaybackSession.cpp`, find:

```cpp
void VoicePlaybackSession::applyDeclick(
    float *output,
    size_t written,
    size_t frameCount) noexcept {
  if (written == 0) {
    // Nothing new to play (underrun, interrupt, idle). Decay from the last
    // emitted sample instead of stepping straight to zero.
    if (lastOutputSample_ != 0.0f) {
      const size_t fade = std::min(kFadeFrames, frameCount);
      for (size_t i = 0; i < fade; ++i) {
        output[i] = lastOutputSample_ *
            (1.0f - static_cast<float>(i + 1) / static_cast<float>(fade));
      }
    }
    lastOutputSample_ = 0.0f;
    outputWasSilent_ = true;
    return;
  }

  if (outputWasSilent_) {
    const size_t fade = std::min(kFadeFrames, written);
    for (size_t i = 0; i < fade; ++i) {
      output[i] *= static_cast<float>(i) / static_cast<float>(fade);
    }
  }

  if (written < frameCount) {
    // Ran dry inside this quantum: fade the tail we do have.
    const size_t fade = std::min(kFadeFrames, written);
    const size_t start = written - fade;
    for (size_t i = 0; i < fade; ++i) {
      output[start + i] *=
          1.0f - static_cast<float>(i + 1) / static_cast<float>(fade);
    }
    lastOutputSample_ = 0.0f;
    outputWasSilent_ = true;
    return;
  }

  lastOutputSample_ = output[frameCount - 1];
  outputWasSilent_ = false;
}
```

Replace it with:

```cpp
void VoicePlaybackSession::finishRender(
    float *output,
    size_t written,
    size_t frameCount,
    bool conceal) noexcept {
  if (written > 0) {
    const size_t fade = std::min(kFadeFrames, written);
    if (concealRemaining_ > 0) {
      // Fresh audio arrived while concealing: crossfade out of the concealment.
      for (size_t i = 0; i < fade; ++i) {
        const float weight = static_cast<float>(i + 1) / static_cast<float>(fade + 1);
        output[i] = output[i] * weight + nextConcealSample() * (1.0f - weight);
      }
    } else if (outputWasSilent_) {
      for (size_t i = 0; i < fade; ++i) {
        output[i] *= static_cast<float>(i) / static_cast<float>(fade);
      }
    }
    resetConcealment();
    pushHistory(output, written);
  }

  if (written == frameCount) {
    lastOutputSample_ = output[frameCount - 1];
    outputWasSilent_ = false;
    return;
  }

  if (conceal && (concealRemaining_ > 0 || startConcealment())) {
    size_t index = written;
    for (; index < frameCount && concealRemaining_ > 0; ++index) {
      output[index] = nextConcealSample();
    }
    concealedFrames_.fetch_add(index - written, std::memory_order_relaxed);
    if (concealRemaining_ > 0) {
      lastOutputSample_ = output[frameCount - 1];
      outputWasSilent_ = false;
    } else {
      // The concealment faded to zero inside this quantum; the rest stays silent.
      lastOutputSample_ = 0.0f;
      outputWasSilent_ = true;
    }
    return;
  }

  if (written > 0) {
    // Ran dry inside this quantum: fade the tail we do have.
    const size_t fade = std::min(kFadeFrames, written);
    const size_t start = written - fade;
    for (size_t i = 0; i < fade; ++i) {
      output[start + i] *= 1.0f - static_cast<float>(i + 1) / static_cast<float>(fade);
    }
  } else if (lastOutputSample_ != 0.0f) {
    // Nothing new to play (interrupt, idle, concealment unavailable). Decay
    // from the last emitted sample instead of stepping straight to zero.
    const size_t fade = std::min(kFadeFrames, frameCount);
    for (size_t i = 0; i < fade; ++i) {
      output[i] = lastOutputSample_ *
          (1.0f - static_cast<float>(i + 1) / static_cast<float>(fade));
    }
  }
  lastOutputSample_ = 0.0f;
  outputWasSilent_ = true;
}

void VoicePlaybackSession::pushHistory(const float *samples, size_t count) noexcept {
  for (size_t i = 0; i < count; ++i) {
    history_[historyWrite_] = samples[i];
    historyWrite_ = (historyWrite_ + 1) % kHistoryFrames;
  }
  historyCount_ = std::min(kHistoryFrames, historyCount_ + count);
}

bool VoicePlaybackSession::startConcealment() noexcept {
  if (concealUsedForGap_) return false;
  const size_t rate = options_.targetSampleRate;
  const size_t minLag = std::max<size_t>(1, rate / 400);  // 400 Hz
  const size_t maxLag = rate / 70;                        // 70 Hz
  const size_t window = rate / 100;                       // 10 ms
  const size_t span = window + maxLag;
  if (span > kHistoryFrames || historyCount_ < span) return false;

  // Newest `span` samples, oldest first.
  std::array<float, kHistoryFrames> recent{};
  for (size_t i = 0; i < span; ++i) {
    recent[i] = history_[(historyWrite_ + kHistoryFrames - span + i) % kHistoryFrames];
  }
  const float *tail = recent.data() + maxLag;

  // Pick the pitch period with the highest normalized autocorrelation.
  size_t bestLag = 0;
  double bestScore = -2.0;
  for (size_t lag = minLag; lag <= maxLag; ++lag) {
    const float *lagged = tail - lag;
    double cross = 0.0;
    double tailEnergy = 0.0;
    double laggedEnergy = 0.0;
    for (size_t n = 0; n < window; ++n) {
      cross += static_cast<double>(tail[n]) * lagged[n];
      tailEnergy += static_cast<double>(tail[n]) * tail[n];
      laggedEnergy += static_cast<double>(lagged[n]) * lagged[n];
    }
    if (tailEnergy <= 1e-9 || laggedEnergy <= 1e-9) continue;
    const double score = cross / std::sqrt(tailEnergy * laggedEnergy);
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }
  if (bestLag == 0) return false;  // silence: nothing to extend

  // Repeat the last pitch period; its first sample follows the last real one.
  concealPeriod_ = bestLag;
  for (size_t i = 0; i < bestLag; ++i) {
    concealTemplate_[i] = recent[span - bestLag + i];
  }
  concealPos_ = 0;
  concealTotal_ = std::max<size_t>(1, rate * options_.concealMaxMs / 1000);
  concealRemaining_ = concealTotal_;
  concealUsedForGap_ = true;
  return true;
}

float VoicePlaybackSession::nextConcealSample() noexcept {
  if (concealRemaining_ == 0 || concealPeriod_ == 0) return 0.0f;
  const float gain = static_cast<float>(concealRemaining_) / static_cast<float>(concealTotal_);
  const float sample = concealTemplate_[concealPos_] * gain;
  concealPos_ = (concealPos_ + 1) % concealPeriod_;
  --concealRemaining_;
  return sample;
}

void VoicePlaybackSession::resetConcealment() noexcept {
  concealRemaining_ = 0;
  concealPos_ = 0;
  concealUsedForGap_ = false;
}
```

In `modules/react-native-memento-voice/common/cpp/mementovoice/VoicePlaybackSession.cpp`, find:

```cpp
      adaptiveExtraSnapshot_.load(std::memory_order_relaxed)};
```

Replace it with:

```cpp
      adaptiveExtraSnapshot_.load(std::memory_order_relaxed),
      concealedFrames_.load(std::memory_order_relaxed)};
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `bun run test:native-voice`
Expected: all three declick tests and all nine quality tests print `PASS`, and the command exits 0. The declick tests still pass because a constant signal is concealed with a smooth fade.

- [ ] **Step 6: Commit**

```bash
git add modules/react-native-memento-voice/common/cpp
git commit -m "feat(voice): conceal short playback gaps"
```

---

### Task 3: Report the new stats in the call metrics

**Files:**
- Modify: `modules/react-native-memento-voice/common/cpp/mementovoice/VoiceSessionHostObject.cpp`
- Modify: `modules/react-native-memento-voice/src/index.ts`
- Modify: `src/features/chat/native-voice-playback-controller.ts`, `src/features/chat/native-voice-playback-controller.test.ts`
- Modify: `src/features/chat/voice-audio-engine.ts`

**Interfaces:**
- Produces: `NativeVoicePlaybackSnapshot.adaptiveExtraMs?` and `concealedFrames?`, `NativeVoicePlaybackController.getStats()`, and `VoiceAudioEngineSnapshot.adaptiveExtraMs?` and `concealedMs?`. These appear in the `[VoiceMode] session metrics` log line.

- [ ] **Step 1: Write the failing test**

Append inside the `describe` of `src/features/chat/native-voice-playback-controller.test.ts`:

```ts
  test('keeps adaptive buffer and concealment stats after stop', () => {
    const { session, controller } = setup();
    controller.targetSampleRate = 48_000;
    session.snapshot = { ...session.snapshot, adaptiveExtraMs: 240, concealedFrames: 4_800 };

    controller.stop();
    session.snapshot = { ...session.snapshot, adaptiveExtraMs: 0, concealedFrames: 0 };

    expect(controller.getStats()).toEqual({ adaptiveExtraMs: 240, concealedMs: 100 });
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test src/features/chat/native-voice-playback-controller.test.ts`
Expected: FAIL with `controller.getStats is not a function`.

- [ ] **Step 3: Expose the fields from C++**

In `modules/react-native-memento-voice/common/cpp/mementovoice/VoiceSessionHostObject.cpp`, find:

```cpp
          result.setProperty(rt, "isAudible", snapshot.isAudible);
```

Replace it with:

```cpp
          result.setProperty(rt, "isAudible", snapshot.isAudible);
          result.setProperty(rt, "adaptiveExtraMs", static_cast<double>(snapshot.adaptiveExtraMs));
          result.setProperty(rt, "concealedFrames", static_cast<double>(snapshot.concealedFrames));
```

In `modules/react-native-memento-voice/src/index.ts`, find:

```ts
  malformedChunkCount: number;
  isAudible: boolean;
};
```

Replace it with:

```ts
  malformedChunkCount: number;
  isAudible: boolean;
  /** Extra buffer the adaptive jitter buffer currently adds. */
  adaptiveExtraMs?: number;
  /** Output frames synthesized by packet loss concealment. */
  concealedFrames?: number;
};
```

- [ ] **Step 4: Keep the final stats in the controller**

In `src/features/chat/native-voice-playback-controller.ts`, find:

```ts
  stop(): void {
    if (this.state === 'stopped') return;
    this.cancelPoll();
    this.session.stop(this.generation);
```

Replace it with:

```ts
  getStats(): { adaptiveExtraMs?: number; concealedMs?: number } {
    const snapshot = this.finalSnapshot ?? this.session.getSnapshot();
    return {
      adaptiveExtraMs: snapshot.adaptiveExtraMs,
      concealedMs:
        snapshot.concealedFrames === undefined || !this.targetSampleRate
          ? undefined
          : Math.round((snapshot.concealedFrames / this.targetSampleRate) * 1_000),
    };
  }

  stop(): void {
    if (this.state === 'stopped') return;
    this.cancelPoll();
    this.finalSnapshot = this.session.getSnapshot();
    this.session.stop(this.generation);
```

In `src/features/chat/native-voice-playback-controller.ts`, find:

```ts
  private lastPlaybackEndTime = 0;
```

Replace it with:

```ts
  private lastPlaybackEndTime = 0;
  private finalSnapshot?: NativeVoicePlaybackSnapshot;
  /** Output sample rate of the native context, used to convert concealed frames to ms. */
  targetSampleRate?: number;
```

- [ ] **Step 5: Carry them into the engine snapshot**

In `src/features/chat/voice-audio-engine.ts`, find:

```ts
  playbackContextSampleRate?: number;
};
```

Replace it with:

```ts
  playbackContextSampleRate?: number;
  adaptiveExtraMs?: number;
  concealedMs?: number;
};
```

In `src/features/chat/voice-audio-engine.ts`, find:

```ts
  private routeChangePromise: Promise<void> = Promise.resolve();
```

Replace it with:

```ts
  private routeChangePromise: Promise<void> = Promise.resolve();
  private nativeStats: { adaptiveExtraMs?: number; concealedMs?: number } = {};
```

In `src/features/chat/voice-audio-engine.ts`, find:

```ts
      playbackContextSampleRate: this.playbackContextSampleRate,
    };
  }
```

Replace it with:

```ts
      playbackContextSampleRate: this.playbackContextSampleRate,
      ...this.nativeStats,
    };
  }
```

In `src/features/chat/voice-audio-engine.ts`, find:

```ts
      this.playback?.stop();
      this.playback = undefined;

      const context = this.context;
```

Replace it with:

```ts
      this.playback?.stop();
      if (this.playback instanceof NativeVoicePlaybackController) {
        this.nativeStats = this.playback.getStats();
      }
      this.playback = undefined;

      const context = this.context;
```

In `src/features/chat/voice-audio-engine.ts`, find:

```ts
    this.playback = nativeSession
      ? new NativeVoicePlaybackController(
          nativeSession,
          this.playbackGeneration,
          this.epoch,
          this.metrics,
          onStateChange,
        )
```

Replace it with:

```ts
    const nativeController = nativeSession
      ? new NativeVoicePlaybackController(
          nativeSession,
          this.playbackGeneration,
          this.epoch,
          this.metrics,
          onStateChange,
        )
      : undefined;
    if (nativeController) nativeController.targetSampleRate = sampleRate;
    this.playback = nativeController
      ? nativeController
```

- [ ] **Step 6: Verify**

Run: `bun run test:native-voice && bun run typecheck && bun test src/features/chat`
Expected: all native tests print `PASS`, there are no type errors, and `0 fail`.

- [ ] **Step 7: Listen on devices**

Rebuild with `npx expo run:ios --device` (and `npx expo run:android --device` once the Android native playback plan is merged). On a phone, turn on Network Link Conditioner on iOS, or a throttled hotspot, with 3% packet loss and 100 ms jitter. Hold a 5-minute call. Expected: no clicks, and short dropouts sound like a brief sustained syllable rather than a hole. The `[VoiceMode] session metrics` log shows `adaptiveExtraMs` between 0 and 360 and a non-zero `concealedMs`.

- [ ] **Step 8: Commit**

```bash
git add modules/react-native-memento-voice src/features/chat/native-voice-playback-controller.ts src/features/chat/native-voice-playback-controller.test.ts src/features/chat/voice-audio-engine.ts
git commit -m "feat(voice): report adaptive buffer and concealment stats"
```
