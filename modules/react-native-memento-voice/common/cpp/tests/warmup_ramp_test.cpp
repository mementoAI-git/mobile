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

std::string pcm16Base64Constant(float value, size_t frames) {
  static const char *alphabet =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  std::vector<uint8_t> bytes;
  const auto sample = static_cast<int16_t>(value * 32767.0f);
  for (size_t i = 0; i < frames; ++i) {
    bytes.push_back(static_cast<uint8_t>(sample & 0xff));
    bytes.push_back(static_cast<uint8_t>((sample >> 8) & 0xff));
  }
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

PlaybackOptions testOptions(uint32_t warmupRampMs) {
  PlaybackOptions options;
  options.sourceSampleRate = 24000;
  options.targetSampleRate = 48000;
  options.startupBufferMs = 20;
  options.recoveryBufferMs = 20;
  options.maxBufferedMs = 5000;
  options.warmupRampMs = warmupRampMs;
  return options;
}

void waitForBuffered(VoicePlaybackSession &session, double ms) {
  for (int i = 0; i < 1000 && session.snapshot().bufferedMs < ms; ++i) {
    std::this_thread::sleep_for(std::chrono::milliseconds(1));
  }
}

std::vector<float> render(VoicePlaybackSession &session, size_t frames) {
  std::vector<float> out(frames, 0.0f);
  for (size_t offset = 0; offset < frames; offset += 128) {
    session.render(out.data() + offset, std::min<size_t>(128, frames - offset));
  }
  return out;
}

// Frames at 48 kHz.
constexpr size_t ms(double milliseconds) {
  return static_cast<size_t>(milliseconds * 48.0);
}

int failures = 0;

void expect(bool ok, const char *name, float value) {
  std::printf("%s %s (%.4f)\n", ok ? "PASS" : "FAIL", name, value);
  if (!ok) ++failures;
}

bool nonDecreasing(const std::vector<float> &samples, size_t from, size_t to) {
  for (size_t i = from + 1; i < to; ++i) {
    if (samples[i] + 1e-4f < samples[i - 1]) return false;
  }
  return true;
}

}  // namespace

int main() {
  {
    // Apple: echo cancellation needs ~200 ms to converge, so the first
    // playback of a session rises over that time instead of starting loud.
    VoicePlaybackSession session(testOptions(200));
    session.start(1, 1);
    session.pushPCM(pcm16Base64Constant(0.5f, 12000), 1, 1, 0);  // 500 ms
    waitForBuffered(session, 490.0);
    const auto out = render(session, ms(300));
    expect(out[ms(20)] < 0.08f, "first playback starts quiet", out[ms(20)]);
    expect(std::fabs(out[ms(100)] - 0.25f) < 0.03f, "halfway through the ramp is half level", out[ms(100)]);
    expect(nonDecreasing(out, 0, ms(200)), "ramp only rises", 0.0f);
    expect(std::fabs(out[ms(250)] - 0.5f) < 0.01f, "full level after the ramp", out[ms(250)]);
    session.stop(1);
  }
  {
    // The ramp is per session: later replies start at full level (after the
    // 5 ms de-click fade), so Memento never sounds like it fades in mid-call.
    VoicePlaybackSession session(testOptions(200));
    session.start(1, 1);
    session.pushPCM(pcm16Base64Constant(0.5f, 7200), 1, 1, 0);  // 300 ms
    waitForBuffered(session, 290.0);
    render(session, ms(300));
    session.interrupt(1, 2);
    render(session, ms(40));
    session.start(1, 2);
    session.pushPCM(pcm16Base64Constant(0.5f, 4800), 1, 2, 0);  // 200 ms
    waitForBuffered(session, 190.0);
    const auto out = render(session, ms(100));
    expect(std::fabs(out[ms(20)] - 0.5f) < 0.01f, "a later reply is not ramped again", out[ms(20)]);
    session.stop(1);
  }
  {
    // Off by default, so sessions that do not ask for it are unchanged.
    VoicePlaybackSession session(testOptions(0));
    session.start(1, 1);
    session.pushPCM(pcm16Base64Constant(0.5f, 4800), 1, 1, 0);  // 200 ms
    waitForBuffered(session, 190.0);
    const auto out = render(session, ms(100));
    expect(std::fabs(out[ms(20)] - 0.5f) < 0.01f, "no ramp when it is off", out[ms(20)]);
    session.stop(1);
  }
  return failures == 0 ? 0 : 1;
}
