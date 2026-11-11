#include "mementovoice/CallRecorder.h"
#include "mementovoice/VoicePlaybackSession.h"

#include <chrono>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <string>
#include <thread>
#include <vector>

using namespace mementovoice;

namespace {

int failures = 0;

void expect(bool ok, const char *name, double value) {
  std::printf("%s %s (%.4f)\n", ok ? "PASS" : "FAIL", name, value);
  if (!ok) ++failures;
}

std::string tempPath(const char *name) {
  const char *dir = std::getenv("TMPDIR");
  std::string path = dir != nullptr ? dir : "/tmp";
  if (path.empty() || path.back() != '/') path += '/';
  return path + name;
}

uint32_t u32(const std::vector<uint8_t> &bytes, size_t at) {
  return bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16) | (static_cast<uint32_t>(bytes[at + 3]) << 24);
}

uint16_t u16(const std::vector<uint8_t> &bytes, size_t at) {
  return static_cast<uint16_t>(bytes[at] | (bytes[at + 1] << 8));
}

std::vector<uint8_t> readFile(const std::string &path) {
  std::vector<uint8_t> bytes;
  std::FILE *file = std::fopen(path.c_str(), "rb");
  if (file == nullptr) return bytes;
  uint8_t buffer[4096];
  size_t read = 0;
  while ((read = std::fread(buffer, 1, sizeof(buffer), file)) > 0) {
    bytes.insert(bytes.end(), buffer, buffer + read);
  }
  std::fclose(file);
  return bytes;
}

std::vector<float> samplesOf(const std::vector<uint8_t> &wav) {
  std::vector<float> out;
  for (size_t i = 44; i + 1 < wav.size(); i += 2) {
    out.push_back(static_cast<int16_t>(u16(wav, i)) / 32767.0f);
  }
  return out;
}

CallRecorderOptions manualOptions() {
  CallRecorderOptions options;
  options.spawnWriter = false;
  return options;
}

// Pushes `ms` of a constant on each side in 10 ms steps, pumping in between,
// the way the render thread, the JS thread and the writer interleave.
void feed(CallRecorder &recorder, uint64_t &now, double ms, uint32_t aiRate, float ai, bool pushAi, float mic, bool pushMic) {
  const size_t aiStep = aiRate / 100;
  const size_t micStep = 160;
  std::vector<float> aiChunk(aiStep, ai);
  std::vector<float> micChunk(micStep, mic);
  for (double t = 0; t < ms; t += 10.0) {
    if (pushAi) recorder.pushAI(1, aiRate, aiChunk.data(), aiChunk.size());
    if (pushMic) recorder.pushMic(micChunk.data(), micChunk.size());
    now += 10;
    recorder.pump(now);
  }
}

} // namespace

int main() {
  {
    // Speech activity: one character per 100 ms, '1' where it was audible.
    const auto path = tempPath("memento_call_activity.wav");
    CallRecorder recorder(manualOptions());
    expect(recorder.start(path), "activity recorder starts", 0);
    uint64_t now = 0;
    feed(recorder, now, 300, 16000, 0.0f, true, 0.2f, true);  // 300 ms speech
    feed(recorder, now, 500, 16000, 0.0f, true, 0.0f, true);  // 500 ms silence
    feed(recorder, now, 200, 16000, 0.2f, true, 0.0f, true);  // 200 ms AI speech
    const auto result = recorder.stop();
    expect(result && result->activity == "1110000011", "activity marks speech and silence per 100 ms",
           result ? static_cast<double>(result->activity.size()) : -1);
    std::remove(path.c_str());
  }
  {
    // WAV header: 44 bytes, PCM mono 16-bit 16 kHz, sizes patched on stop.
    const auto path = tempPath("memento_call_header.wav");
    CallRecorder recorder(manualOptions());
    expect(recorder.start(path), "recorder starts", 0);
    expect(!recorder.start(path), "second start is refused", 0);
    uint64_t now = 0;
    feed(recorder, now, 500, 16000, 0.1f, true, 0.1f, true);
    const auto result = recorder.stop();
    const auto wav = readFile(path);
    expect(result.has_value(), "stop returns a result", 0);
    expect(wav.size() > 44 && std::memcmp(wav.data(), "RIFF", 4) == 0 &&
               std::memcmp(wav.data() + 8, "WAVE", 4) == 0 &&
               std::memcmp(wav.data() + 12, "fmt ", 4) == 0 &&
               std::memcmp(wav.data() + 36, "data", 4) == 0,
           "RIFF/WAVE/fmt/data tags", static_cast<double>(wav.size()));
    expect(u16(wav, 20) == 1 && u16(wav, 22) == 1 && u32(wav, 24) == 16000 &&
               u32(wav, 28) == 32000 && u16(wav, 32) == 2 && u16(wav, 34) == 16,
           "PCM mono 16-bit 16 kHz format", u32(wav, 24));
    expect(u32(wav, 40) == wav.size() - 44, "data size matches the file", u32(wav, 40));
    expect(u32(wav, 4) == wav.size() - 8, "RIFF size matches the file", u32(wav, 4));
    expect(u32(wav, 40) / 2 == 8000, "500 ms is 8000 frames", u32(wav, 40) / 2.0);
    expect(result && std::fabs(result->durationMs - 500.0) < 0.5, "duration is 500 ms", result ? result->durationMs : -1);
    expect(!recorder.stop().has_value(), "second stop returns nothing", 0);
    std::remove(path.c_str());
  }
  {
    // Mixing: the two tracks sum, and loud sums are limited, not wrapped.
    const auto path = tempPath("memento_call_mix.wav");
    CallRecorder recorder(manualOptions());
    recorder.start(path);
    uint64_t now = 0;
    feed(recorder, now, 300, 16000, 0.2f, true, 0.1f, true);
    feed(recorder, now, 300, 16000, 0.9f, true, 0.9f, true);
    recorder.stop();
    const auto samples = samplesOf(readFile(path));
    expect(std::fabs(samples[2400] - 0.3f) < 0.002f, "AI 0.2 + mic 0.1 mixes to 0.3", samples[2400]);
    float peak = 0.0f;
    for (float s : samples) peak = std::max(peak, std::fabs(s));
    expect(samples[7200] > 0.9f && peak <= 1.0f, "a loud sum is soft clipped below full scale", samples[7200]);
    expect(std::fabs(softClip(0.5f) - 0.5f) < 1e-6f && softClip(10.0f) <= 1.0f && softClip(-10.0f) >= -1.0f,
           "soft clip is linear when quiet and bounded when loud", softClip(10.0f));
    std::remove(path.c_str());
  }
  {
    // 48 kHz -> 16 kHz: one second of AI audio becomes one second (16000
    // frames), and a tone above 8 kHz is filtered out instead of aliasing.
    StreamResampler resampler;
    resampler.configure(48000, 16000);
    std::vector<float> input(48000, 0.5f);
    std::vector<float> out;
    for (size_t at = 0; at < input.size(); at += 128) {
      resampler.process(input.data() + at, std::min<size_t>(128, input.size() - at), out);
    }
    expect(out.size() >= 15999 && out.size() <= 16001, "48k -> 16k keeps the length", static_cast<double>(out.size()));
    expect(std::fabs(out[8000] - 0.5f) < 0.001f, "48k -> 16k keeps the level", out[8000]);

    resampler.configure(48000, 16000);
    std::vector<float> tone(48000);
    for (size_t i = 0; i < tone.size(); ++i) tone[i] = 0.5f * std::sin(2.0 * 3.14159265358979 * 12000.0 * i / 48000.0);
    out.clear();
    resampler.process(tone.data(), tone.size(), out);
    double energy = 0.0;
    for (size_t i = 1000; i < out.size(); ++i) energy += out[i] * out[i];
    const double rms = std::sqrt(energy / static_cast<double>(out.size() - 1000));
    expect(rms < 0.02, "a 12 kHz tone does not alias into 16 kHz output", rms);

    resampler.configure(44100, 16000);
    std::vector<float> cd(44100, 0.25f);
    out.clear();
    resampler.process(cd.data(), cd.size(), out);
    expect(out.size() >= 15999 && out.size() <= 16001, "44.1k -> 16k keeps the length", static_cast<double>(out.size()));
  }
  {
    // A 48 kHz AI track records at real-time length next to the mic.
    const auto path = tempPath("memento_call_48k.wav");
    CallRecorder recorder(manualOptions());
    recorder.start(path);
    uint64_t now = 0;
    feed(recorder, now, 1000, 48000, 0.2f, true, 0.0f, true);
    const auto result = recorder.stop();
    const auto samples = samplesOf(readFile(path));
    expect(samples.size() >= 15990 && samples.size() <= 16010, "1 s of 48 kHz AI is 16000 frames", static_cast<double>(samples.size()));
    expect(std::fabs(samples[8000] - 0.2f) < 0.002f, "48 kHz AI level survives", samples[8000]);
    expect(result && std::fabs(result->durationMs - 1000.0) < 2.0, "48 kHz duration is 1 s", result ? result->durationMs : -1);
    std::remove(path.c_str());
  }
  {
    // Zero padding: the AI side never renders, so the mic is recorded alone
    // in real time once the gap passes 200 ms; and vice versa.
    const auto path = tempPath("memento_call_pad.wav");
    CallRecorder recorder(manualOptions());
    recorder.start(path);
    uint64_t now = 0;
    feed(recorder, now, 150, 16000, 0.0f, false, 0.3f, true);
    expect(recorder.framesWritten() == 0, "waits up to 200 ms for a missing side", static_cast<double>(recorder.framesWritten()));
    feed(recorder, now, 850, 16000, 0.0f, false, 0.3f, true);
    const double afterMicOnly = static_cast<double>(recorder.framesWritten());
    expect(afterMicOnly >= 16000 - 3200 - 160 && afterMicOnly <= 16000,
           "mic-only audio is written in real time with the AI padded", afterMicOnly);
    expect(recorder.stats().aiPaddedFrames > 0, "AI padding is counted", static_cast<double>(recorder.stats().aiPaddedFrames));
    feed(recorder, now, 1000, 16000, 0.4f, true, 0.0f, false);
    recorder.stop();
    const auto samples = samplesOf(readFile(path));
    expect(samples.size() == 32000, "2 s of one-sided audio is 32000 frames", static_cast<double>(samples.size()));
    expect(std::fabs(samples[8000] - 0.3f) < 0.002f, "mic-only stretch is the mic", samples[8000]);
    expect(std::fabs(samples[24000] - 0.4f) < 0.002f, "AI-only stretch is the AI", samples[24000]);
    std::remove(path.c_str());
  }
  {
    // The AI rate changes mid-call (a session rebuilt for a new output
    // route): audio before and after keeps its real-time length.
    const auto path = tempPath("memento_call_rate_change.wav");
    CallRecorder recorder(manualOptions());
    recorder.start(path);
    uint64_t now = 0;
    feed(recorder, now, 500, 48000, 0.2f, true, 0.0f, true);
    // 100 ms with no session rendering (shorter than the 200 ms gap rule):
    // the new session's arrival still marks that time as AI silence.
    feed(recorder, now, 100, 48000, 0.0f, false, 0.0f, true);
    std::vector<float> chunk(441, 0.2f);
    std::vector<float> mic(160, 0.0f);
    for (int i = 0; i < 50; ++i) {
      recorder.pushAI(2, 44100, chunk.data(), chunk.size());
      recorder.pushMic(mic.data(), mic.size());
      now += 10;
      recorder.pump(now);
    }
    recorder.stop();
    const auto samples = samplesOf(readFile(path));
    expect(samples.size() >= 17580 && samples.size() <= 17620, "48k, a 100 ms gap, then 44.1k totals 1.1 s", static_cast<double>(samples.size()));
    expect(std::fabs(samples[8800]) < 0.002f, "the gap between sessions is silent", samples[8800]);
    expect(std::fabs(samples[7600] - 0.2f) < 0.002f && std::fabs(samples[9400]) < 0.002f,
           "the old session's audio stays before the gap", samples[7600]);
    expect(std::fabs(samples[14000] - 0.2f) < 0.002f, "44.1 kHz AI level survives after the gap", samples[14000]);
    std::remove(path.c_str());
  }
  {
    // A recording that fails to open reports failure.
    CallRecorder recorder(manualOptions());
    expect(!recorder.start("/nonexistent-dir/x/y.wav"), "an unwritable path fails to start", 0);
    expect(!recorder.stop().has_value(), "stop without a recording is empty", 0);
  }
  {
    // End to end through the global recorder: a playback session's render
    // feeds it, the writer thread runs in real time, and stop finalises.
    const auto path = tempPath("memento_call_global.wav");
    PlaybackOptions options;
    options.targetSampleRate = 48000;
    VoicePlaybackSession session(options);
    expect(globalCallRecordingMs() == 0.0, "recordingMs is 0 before recording", 0);
    expect(startGlobalCallRecording(path), "global recording starts", 0);
    expect(!startGlobalCallRecording(path), "a second global start is refused", 0);
    std::vector<float> out(480);
    std::vector<float> mic(640, 0.1f);
    const auto begin = std::chrono::steady_clock::now();
    for (int i = 0; i < 60; ++i) {  // ~600 ms
      session.render(out.data(), out.size());
      if (i % 4 == 0) pushGlobalCallRecordingMic(mic.data(), mic.size());
      std::this_thread::sleep_until(begin + std::chrono::milliseconds(10 * (i + 1)));
    }
    const double midMs = globalCallRecordingMs();
    const auto result = stopGlobalCallRecording();
    const auto wav = readFile(path);
    expect(midMs > 300.0, "recordingMs advances while recording", midMs);
    expect(result.has_value() && result->path == path, "global stop returns the path", 0);
    expect(result && result->durationMs > 550.0 && result->durationMs < 700.0, "global duration is ~600 ms", result ? result->durationMs : -1);
    expect(wav.size() >= 44 && u32(wav, 40) == wav.size() - 44, "global file sizes are final", wav.size());
    expect(!stopGlobalCallRecording().has_value(), "global stop without a recording is null", 0);
    expect(globalCallRecordingMs() == 0.0, "recordingMs is 0 after stop", 0);
    session.stop(1);
    std::remove(path.c_str());
  }
  return failures == 0 ? 0 : 1;
}
