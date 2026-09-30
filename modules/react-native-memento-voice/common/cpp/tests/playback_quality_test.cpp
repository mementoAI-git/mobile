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
