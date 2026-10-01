#include "mementovoice/VoicePlaybackSession.h"

#include <chrono>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <memory>
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

float maxStep(const std::vector<float> &samples) {
  float worst = 0.0f;
  for (size_t i = 1; i < samples.size(); ++i) {
    worst = std::max(worst, std::fabs(samples[i] - samples[i - 1]));
  }
  return worst;
}

PlaybackOptions testOptions() {
  PlaybackOptions options;
  options.sourceSampleRate = 24000;
  options.targetSampleRate = 48000;
  options.startupBufferMs = 20;
  options.recoveryBufferMs = 20;
  options.maxBufferedMs = 5000;
  return options;
}

void waitForBuffered(VoicePlaybackSession &session, double ms) {
  for (int i = 0; i < 1000 && session.snapshot().bufferedMs < ms; ++i) {
    std::this_thread::sleep_for(std::chrono::milliseconds(1));
  }
}

void renderQuanta(VoicePlaybackSession &session, int quanta, std::vector<float> &out) {
  float buffer[128];
  for (int q = 0; q < quanta; ++q) {
    session.render(buffer, 128);
    out.insert(out.end(), buffer, buffer + 128);
  }
}

int failures = 0;

void expectSmooth(const char *name, const std::vector<float> &samples) {
  const float step = maxStep(samples);
  const bool ok = step < 0.02f;
  std::printf("%s %s (max step %.4f)\n", ok ? "PASS" : "FAIL", name, step);
  if (!ok) ++failures;
}

}  // namespace

int main() {
  {
    VoicePlaybackSession session(testOptions());
    session.start(1, 1);
    session.pushPCM(pcm16Base64Constant(0.5f, 1200), 1, 1, 0);  // 50 ms, turn stays open
    waitForBuffered(session, 45.0);
    std::vector<float> out{0.0f};  // silence before playback
    renderQuanta(session, 30, out);  // ~80 ms, so it underruns mid-way
    expectSmooth("underrun fades out instead of stepping to silence", out);
    session.stop(1);
  }
  {
    VoicePlaybackSession session(testOptions());
    session.start(1, 1);
    session.pushPCM(pcm16Base64Constant(0.5f, 4800), 1, 1, 0);  // 200 ms
    waitForBuffered(session, 190.0);
    std::vector<float> out{0.0f};  // silence before playback
    renderQuanta(session, 8, out);
    session.interrupt(1, 2);
    renderQuanta(session, 8, out);
    expectSmooth("interrupt decays instead of cutting mid-waveform", out);
    session.stop(1);
  }
  {
    VoicePlaybackSession session(testOptions());
    session.start(1, 1);
    session.pushPCM(pcm16Base64Constant(0.5f, 2400), 1, 1, 0);  // 100 ms
    waitForBuffered(session, 95.0);
    std::vector<float> out{0.0f};  // silence before playback
    renderQuanta(session, 4, out);
    expectSmooth("playback start fades in from silence", out);
    session.stop(1);
  }
  return failures == 0 ? 0 : 1;
}