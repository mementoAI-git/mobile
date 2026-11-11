#pragma once

#include <array>
#include <atomic>
#include <condition_variable>
#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <memory>
#include <mutex>
#include <optional>
#include <string>
#include <thread>
#include <type_traits>
#include <vector>

namespace mementovoice {

// Lock-free single-producer / single-consumer ring of trivially copyable
// values. Capacity is rounded up to a power of two. write() and read() never
// allocate or block; write() stores what fits and returns how much that was.
template <typename T>
class SpscRing {
  static_assert(std::is_trivially_copyable_v<T>);

 public:
  explicit SpscRing(size_t minimumCapacity) {
    size_t capacity = 1;
    while (capacity < minimumCapacity) capacity <<= 1;
    mask_ = capacity - 1;
    data_ = std::make_unique<T[]>(capacity);
  }

  size_t capacity() const noexcept { return mask_ + 1; }

  size_t available() const noexcept {
    return static_cast<size_t>(
        head_.load(std::memory_order_acquire) - tail_.load(std::memory_order_acquire));
  }

  size_t freeSpace() const noexcept { return capacity() - available(); }

  // Producer only.
  size_t write(const T *values, size_t count) noexcept {
    const uint64_t head = head_.load(std::memory_order_relaxed);
    const uint64_t tail = tail_.load(std::memory_order_acquire);
    const size_t space = capacity() - static_cast<size_t>(head - tail);
    const size_t amount = count < space ? count : space;
    const size_t start = static_cast<size_t>(head) & mask_;
    const size_t first = amount < capacity() - start ? amount : capacity() - start;
    std::memcpy(data_.get() + start, values, first * sizeof(T));
    if (amount > first) std::memcpy(data_.get(), values + first, (amount - first) * sizeof(T));
    head_.store(head + amount, std::memory_order_release);
    return amount;
  }

  // Consumer only.
  size_t read(T *values, size_t count) noexcept {
    const uint64_t tail = tail_.load(std::memory_order_relaxed);
    const uint64_t head = head_.load(std::memory_order_acquire);
    const size_t ready = static_cast<size_t>(head - tail);
    const size_t amount = count < ready ? count : ready;
    const size_t start = static_cast<size_t>(tail) & mask_;
    const size_t first = amount < capacity() - start ? amount : capacity() - start;
    std::memcpy(values, data_.get() + start, first * sizeof(T));
    if (amount > first) std::memcpy(values + first, data_.get(), (amount - first) * sizeof(T));
    tail_.store(tail + amount, std::memory_order_release);
    return amount;
  }

  // Consumer only: the oldest value without consuming it.
  bool peek(T &value) const noexcept {
    const uint64_t tail = tail_.load(std::memory_order_relaxed);
    if (head_.load(std::memory_order_acquire) == tail) return false;
    value = data_[static_cast<size_t>(tail) & mask_];
    return true;
  }

 private:
  std::unique_ptr<T[]> data_;
  size_t mask_ = 0;
  alignas(64) std::atomic<uint64_t> head_{0};
  alignas(64) std::atomic<uint64_t> tail_{0};
};

// Streaming low-pass + linear-interpolation resampler to a fixed output rate.
// Downsampling runs a windowed-sinc FIR (cutoff ~0.45 of the output rate)
// before interpolating, so 48 kHz -> 16 kHz does not alias.
class StreamResampler {
 public:
  void configure(uint32_t inputRate, uint32_t outputRate);
  void reset() noexcept;
  void process(const float *input, size_t count, std::vector<float> &output);
  uint32_t inputRate() const noexcept { return inputRate_; }

 private:
  static constexpr size_t kTaps = 33;
  uint32_t inputRate_ = 0;
  uint32_t outputRate_ = 0;
  double step_ = 1.0;
  bool filter_ = false;
  std::array<float, kTaps> taps_{};
  std::array<float, kTaps> history_{};
  size_t historyPos_ = 0;
  double position_ = 0.0;
  float previous_ = 0.0f;
};

struct CallRecorderOptions {
  uint32_t outputSampleRate = 16000;
  uint32_t micSampleRate = 16000;
  // Ring sizes: seconds of audio each side can queue before it drops.
  uint32_t ringSeconds = 4;
  // Largest AI device rate the AI ring is sized for.
  uint32_t maxAiSampleRate = 48000;
  // A side silent for longer than this while the other advances is padded
  // with zeros so the two stay aligned in real time.
  uint32_t gapPadMs = 200;
  // Neither side may run further ahead than this; the lagging side is padded.
  uint32_t maxLeadMs = 1000;
  // Re-patch the WAV header this often so a crash still leaves a playable file.
  uint32_t headerRefreshMs = 2000;
  uint32_t pumpIntervalMs = 20;
  // Tests drive pump() themselves.
  bool spawnWriter = true;
};

struct CallRecordingResult {
  std::string path;
  double durationMs = 0.0;
  // Speech activity of the mixed recording, one character per 100 ms
  // window: '1' when someone was audible, '0' for silence.
  std::string activity;
};

// Window and level for the speech activity map.
constexpr size_t kActivityWindowFrames = 1600;  // 100 ms at 16 kHz
constexpr float kActivityRmsThreshold = 0.015f; // about -36 dBFS

struct CallRecorderStats {
  uint64_t framesWritten = 0;
  uint64_t aiOverflowFrames = 0;
  uint64_t micOverflowFrames = 0;
  uint64_t aiPaddedFrames = 0;
  uint64_t micPaddedFrames = 0;
};

// Records a call as a 16-bit mono WAV: what the AI said (the playback output
// at the device rate, resampled) mixed with the user's 16 kHz mic.
class CallRecorder {
 public:
  explicit CallRecorder(CallRecorderOptions options = {});
  ~CallRecorder();
  CallRecorder(const CallRecorder &) = delete;
  CallRecorder &operator=(const CallRecorder &) = delete;

  bool start(const std::string &path);
  // Audio render thread. Real-time safe: no locks, no allocation. If another
  // producer is already inside, or a ring is full, the audio is dropped.
  void pushAI(uint64_t sourceId, uint32_t sampleRate, const float *samples, size_t count) noexcept;
  // JS thread (single producer).
  void pushMic(const float *samples, size_t count) noexcept;
  // Writer step: drain, resample, align, mix, write. Called by the writer
  // thread, or directly by tests with spawnWriter = false.
  void pump(uint64_t nowMs);
  std::optional<CallRecordingResult> stop();

  bool isRecording() const noexcept { return recording_.load(std::memory_order_acquire); }
  uint64_t framesWritten() const noexcept { return framesWritten_.load(std::memory_order_acquire); }
  double recordingMs() const noexcept;
  CallRecorderStats stats() const noexcept;

 private:
  struct RateMarker {
    uint64_t position;  // absolute AI sample index the new rate starts at
    uint32_t sampleRate;
    bool discontinuity;  // a different playback session took over
  };

  void writerLoop();
  void pumpLocked(uint64_t nowMs, bool final);
  void drainAi(bool &gotAudio);
  void writeMixed(size_t frames);
  void patchHeader();
  uint64_t msToFrames(uint32_t ms) const noexcept;

  CallRecorderOptions options_;
  SpscRing<float> aiRing_;
  SpscRing<RateMarker> aiMarkers_;
  SpscRing<float> micRing_;

  // Producer-side state, guarded by producerBusy_.
  std::atomic<bool> producerBusy_{false};
  uint64_t producerSource_ = 0;
  uint32_t producerRate_ = 0;
  uint64_t aiWritten_ = 0;

  std::atomic<bool> recording_{false};
  std::atomic<uint64_t> framesWritten_{0};
  std::atomic<uint64_t> aiOverflowFrames_{0};
  std::atomic<uint64_t> micOverflowFrames_{0};
  std::atomic<uint64_t> aiPaddedFrames_{0};
  std::atomic<uint64_t> micPaddedFrames_{0};

  // Writer-side state, guarded by pumpMutex_.
  std::mutex pumpMutex_;
  std::FILE *file_ = nullptr;
  std::string path_;
  uint64_t aiRead_ = 0;
  StreamResampler resampler_;
  std::vector<float> scratch_;
  std::vector<float> aiPending_;
  std::vector<float> micPending_;
  std::vector<int16_t> pcm_;
  // Writer-owned speech activity: the current window and the finished ones.
  double activitySumSquares_ = 0.0;
  size_t activityFrames_ = 0;
  std::string activity_;
  uint64_t lastAiAtMs_ = 0;
  uint64_t lastMicAtMs_ = 0;
  uint64_t lastHeaderFrames_ = 0;

  std::mutex wakeMutex_;
  std::condition_variable wakeCv_;
  bool stopWriter_ = false;
  std::thread writer_;
  uint64_t startedAtMs_ = 0;
};

// Mixes two samples and limits the sum: linear up to 0.7, then a tanh knee
// that approaches (never exceeds) full scale.
float softClip(float value) noexcept;

// Writes a 44-byte PCM WAV header for 16-bit mono audio.
void writeWavHeader(uint8_t *header, uint32_t sampleRate, uint32_t dataBytes) noexcept;

// --- Process-wide recorder ---------------------------------------------------
// One recording per process, independent of playback sessions: the JS engine
// rebuilds the session (possibly at a new device rate) on audio route changes
// mid-call, and every session's render forwards its output here.
bool startGlobalCallRecording(const std::string &path);
void pushGlobalCallRecordingMic(const float *samples, size_t count);
double globalCallRecordingMs();
std::optional<CallRecordingResult> stopGlobalCallRecording();

} // namespace mementovoice
