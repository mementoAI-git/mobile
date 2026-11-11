#include "CallRecorder.h"

#include "VoicePlaybackSession.h"

#include <algorithm>
#include <chrono>
#include <cmath>

namespace mementovoice {
namespace {

constexpr size_t kScratchFrames = 4096;
constexpr size_t kWavHeaderBytes = 44;
constexpr double kPi = 3.14159265358979323846;

uint64_t steadyNowMs() {
  return static_cast<uint64_t>(std::chrono::duration_cast<std::chrono::milliseconds>(
                                   std::chrono::steady_clock::now().time_since_epoch())
                                   .count());
}

void putU32(uint8_t *out, uint32_t value) {
  out[0] = static_cast<uint8_t>(value & 0xff);
  out[1] = static_cast<uint8_t>((value >> 8) & 0xff);
  out[2] = static_cast<uint8_t>((value >> 16) & 0xff);
  out[3] = static_cast<uint8_t>((value >> 24) & 0xff);
}

void putU16(uint8_t *out, uint16_t value) {
  out[0] = static_cast<uint8_t>(value & 0xff);
  out[1] = static_cast<uint8_t>((value >> 8) & 0xff);
}

void padTo(std::vector<float> &buffer, size_t size, std::atomic<uint64_t> &counter) {
  if (buffer.size() >= size) return;
  counter.fetch_add(size - buffer.size(), std::memory_order_relaxed);
  buffer.resize(size, 0.0f);
}

} // namespace

// --- StreamResampler ---------------------------------------------------------

void StreamResampler::configure(uint32_t inputRate, uint32_t outputRate) {
  inputRate_ = inputRate == 0 ? outputRate : inputRate;
  outputRate_ = outputRate;
  step_ = static_cast<double>(inputRate_) / static_cast<double>(outputRate_);
  filter_ = inputRate_ > outputRate_;
  if (filter_) {
    // Windowed-sinc low-pass, cutoff in cycles per input sample.
    const double cutoff = 0.45 * static_cast<double>(outputRate_) / static_cast<double>(inputRate_);
    const double middle = static_cast<double>(kTaps - 1) / 2.0;
    double sum = 0.0;
    for (size_t i = 0; i < kTaps; ++i) {
      const double x = static_cast<double>(i) - middle;
      const double sinc = x == 0.0 ? 2.0 * cutoff : std::sin(2.0 * kPi * cutoff * x) / (kPi * x);
      const double phase = 2.0 * kPi * static_cast<double>(i) / static_cast<double>(kTaps - 1);
      const double window = 0.42 - 0.5 * std::cos(phase) + 0.08 * std::cos(2.0 * phase);
      taps_[i] = static_cast<float>(sinc * window);
      sum += sinc * window;
    }
    for (auto &tap : taps_) tap = static_cast<float>(tap / sum);
  }
  reset();
}

void StreamResampler::reset() noexcept {
  history_.fill(0.0f);
  historyPos_ = 0;
  position_ = 0.0;
  previous_ = 0.0f;
}

void StreamResampler::process(const float *input, size_t count, std::vector<float> &output) {
  if (inputRate_ == outputRate_) {
    output.insert(output.end(), input, input + count);
    return;
  }
  for (size_t n = 0; n < count; ++n) {
    float sample = std::isfinite(input[n]) ? input[n] : 0.0f;
    if (filter_) {
      history_[historyPos_] = sample;
      float acc = 0.0f;
      size_t index = historyPos_;
      for (size_t k = 0; k < kTaps; ++k) {
        acc += taps_[k] * history_[index];
        index = index == 0 ? kTaps - 1 : index - 1;
      }
      historyPos_ = historyPos_ + 1 == kTaps ? 0 : historyPos_ + 1;
      sample = acc;
    }
    // Output positions that fall between the previous sample and this one.
    while (position_ < 1.0) {
      output.push_back(previous_ + (sample - previous_) * static_cast<float>(position_));
      position_ += step_;
    }
    position_ -= 1.0;
    previous_ = sample;
  }
}

// --- Helpers -----------------------------------------------------------------

float softClip(float value) noexcept {
  if (!std::isfinite(value)) return 0.0f;
  constexpr float knee = 0.7f;
  constexpr float range = 1.0f - knee;
  const float magnitude = std::fabs(value);
  if (magnitude <= knee) return value;
  const float limited = knee + range * std::tanh((magnitude - knee) / range);
  return value < 0.0f ? -limited : limited;
}

void writeWavHeader(uint8_t *header, uint32_t sampleRate, uint32_t dataBytes) noexcept {
  std::memcpy(header, "RIFF", 4);
  putU32(header + 4, 36 + dataBytes);
  std::memcpy(header + 8, "WAVE", 4);
  std::memcpy(header + 12, "fmt ", 4);
  putU32(header + 16, 16);           // fmt chunk size
  putU16(header + 20, 1);            // PCM
  putU16(header + 22, 1);            // mono
  putU32(header + 24, sampleRate);
  putU32(header + 28, sampleRate * 2);  // byte rate
  putU16(header + 32, 2);            // block align
  putU16(header + 34, 16);           // bits per sample
  std::memcpy(header + 36, "data", 4);
  putU32(header + 40, dataBytes);
}

// --- CallRecorder ------------------------------------------------------------

CallRecorder::CallRecorder(CallRecorderOptions options)
    : options_(options),
      aiRing_(static_cast<size_t>(options.maxAiSampleRate) * options.ringSeconds),
      aiMarkers_(64),
      micRing_(static_cast<size_t>(options.micSampleRate) * options.ringSeconds) {
  scratch_.resize(kScratchFrames);
  aiPending_.reserve(options_.outputSampleRate * 2);
  micPending_.reserve(options_.outputSampleRate * 2);
  pcm_.reserve(options_.outputSampleRate * 2);
}

CallRecorder::~CallRecorder() { stop(); }

uint64_t CallRecorder::msToFrames(uint32_t ms) const noexcept {
  return static_cast<uint64_t>(ms) * options_.outputSampleRate / 1000;
}

double CallRecorder::recordingMs() const noexcept {
  return static_cast<double>(framesWritten()) * 1000.0 /
      static_cast<double>(options_.outputSampleRate);
}

CallRecorderStats CallRecorder::stats() const noexcept {
  return {
      framesWritten(),
      aiOverflowFrames_.load(std::memory_order_relaxed),
      micOverflowFrames_.load(std::memory_order_relaxed),
      aiPaddedFrames_.load(std::memory_order_relaxed),
      micPaddedFrames_.load(std::memory_order_relaxed),
  };
}

bool CallRecorder::start(const std::string &path) {
  std::lock_guard lock(pumpMutex_);
  if (file_ != nullptr || recording_.load(std::memory_order_acquire) || path.empty()) return false;
  std::FILE *file = std::fopen(path.c_str(), "wb");
  if (file == nullptr) return false;
  uint8_t header[kWavHeaderBytes];
  writeWavHeader(header, options_.outputSampleRate, 0);
  if (std::fwrite(header, 1, kWavHeaderBytes, file) != kWavHeaderBytes) {
    std::fclose(file);
    std::remove(path.c_str());
    return false;
  }
  file_ = file;
  path_ = path;
  activity_.clear();
  activitySumSquares_ = 0.0;
  activityFrames_ = 0;
  resampler_.configure(options_.outputSampleRate, options_.outputSampleRate);
  startedAtMs_ = options_.spawnWriter ? steadyNowMs() : 0;
  lastAiAtMs_ = startedAtMs_;
  lastMicAtMs_ = startedAtMs_;
  recording_.store(true, std::memory_order_release);
  if (options_.spawnWriter) {
    try {
      writer_ = std::thread([this] { writerLoop(); });
    } catch (...) {
      recording_.store(false, std::memory_order_release);
      std::fclose(file_);
      file_ = nullptr;
      std::remove(path.c_str());
      return false;
    }
  }
  return true;
}

void CallRecorder::pushAI(
    uint64_t sourceId,
    uint32_t sampleRate,
    const float *samples,
    size_t count) noexcept {
  if (count == 0 || !recording_.load(std::memory_order_acquire)) return;
  if (producerBusy_.exchange(true, std::memory_order_acquire)) {
    // Two render threads at once (an old and a rebuilt session overlapping):
    // the ring has one producer, so the late one is dropped.
    aiOverflowFrames_.fetch_add(count, std::memory_order_relaxed);
    return;
  }
  if (sourceId != producerSource_ || sampleRate != producerRate_) {
    const RateMarker marker{aiWritten_, sampleRate, sourceId != producerSource_};
    if (aiMarkers_.write(&marker, 1) == 0) {
      aiOverflowFrames_.fetch_add(count, std::memory_order_relaxed);
      producerBusy_.store(false, std::memory_order_release);
      return;
    }
    producerSource_ = sourceId;
    producerRate_ = sampleRate;
  }
  const size_t written = aiRing_.write(samples, count);
  aiWritten_ += written;
  if (written < count) aiOverflowFrames_.fetch_add(count - written, std::memory_order_relaxed);
  producerBusy_.store(false, std::memory_order_release);
}

void CallRecorder::pushMic(const float *samples, size_t count) noexcept {
  if (count == 0 || !recording_.load(std::memory_order_acquire)) return;
  const size_t written = micRing_.write(samples, count);
  if (written < count) micOverflowFrames_.fetch_add(count - written, std::memory_order_relaxed);
}

void CallRecorder::writerLoop() {
  std::unique_lock lock(wakeMutex_);
  while (!stopWriter_) {
    wakeCv_.wait_for(lock, std::chrono::milliseconds(options_.pumpIntervalMs));
    if (stopWriter_) break;
    lock.unlock();
    pump(steadyNowMs());
    lock.lock();
  }
}

void CallRecorder::pump(uint64_t nowMs) {
  std::lock_guard lock(pumpMutex_);
  if (file_ == nullptr) return;
  pumpLocked(nowMs, false);
}

void CallRecorder::drainAi(bool &gotAudio) {
  while (true) {
    // Snapshot the sample count first: every marker for those samples was
    // published before them, so it is visible to the peek below.
    const size_t available = aiRing_.available();
    RateMarker marker{};
    while (aiMarkers_.peek(marker) && marker.position <= aiRead_) {
      aiMarkers_.read(&marker, 1);
      if (marker.sampleRate != resampler_.inputRate()) {
        resampler_.configure(marker.sampleRate, options_.outputSampleRate);
      } else if (marker.discontinuity) {
        resampler_.reset();
      }
      if (marker.discontinuity) {
        // A new playback session took over: the gap since the last session's
        // audio is silence. Its audio already queued here arrived during the
        // same window as the newest mic audio, so leave room for it.
        const size_t queued = static_cast<size_t>(
            static_cast<uint64_t>(available) * options_.outputSampleRate /
            std::max<uint32_t>(marker.sampleRate, 1));
        if (micPending_.size() > aiPending_.size() + queued) {
          padTo(aiPending_, micPending_.size() - queued, aiPaddedFrames_);
        }
      }
    }
    size_t limit = std::min(available, scratch_.size());
    if (aiMarkers_.peek(marker) && marker.position > aiRead_) {
      limit = std::min<size_t>(limit, static_cast<size_t>(marker.position - aiRead_));
    }
    if (limit == 0) return;
    const size_t read = aiRing_.read(scratch_.data(), limit);
    if (read == 0) return;
    aiRead_ += read;
    resampler_.process(scratch_.data(), read, aiPending_);
    gotAudio = true;
  }
}

void CallRecorder::pumpLocked(uint64_t nowMs, bool final) {
  bool gotMic = false;
  while (true) {
    const size_t read = micRing_.read(scratch_.data(), scratch_.size());
    if (read == 0) break;
    micPending_.insert(micPending_.end(), scratch_.data(), scratch_.data() + read);
    gotMic = true;
  }
  if (gotMic) lastMicAtMs_ = nowMs;
  bool gotAi = false;
  drainAi(gotAi);
  if (gotAi) lastAiAtMs_ = nowMs;

  if (final) {
    const size_t longest = std::max(aiPending_.size(), micPending_.size());
    padTo(aiPending_, longest, aiPaddedFrames_);
    padTo(micPending_, longest, micPaddedFrames_);
  } else {
    if (aiPending_.size() > micPending_.size() && nowMs - lastMicAtMs_ > options_.gapPadMs) {
      padTo(micPending_, aiPending_.size(), micPaddedFrames_);
    } else if (micPending_.size() > aiPending_.size() && nowMs - lastAiAtMs_ > options_.gapPadMs) {
      padTo(aiPending_, micPending_.size(), aiPaddedFrames_);
    }
    const size_t maxLead = static_cast<size_t>(msToFrames(options_.maxLeadMs));
    if (aiPending_.size() > micPending_.size() + maxLead) {
      padTo(micPending_, aiPending_.size() - maxLead, micPaddedFrames_);
    } else if (micPending_.size() > aiPending_.size() + maxLead) {
      padTo(aiPending_, micPending_.size() - maxLead, aiPaddedFrames_);
    }
  }

  writeMixed(std::min(aiPending_.size(), micPending_.size()));
  if (framesWritten() - lastHeaderFrames_ >= msToFrames(options_.headerRefreshMs)) patchHeader();
}

void CallRecorder::writeMixed(size_t frames) {
  if (frames == 0) return;
  pcm_.resize(frames);
  for (size_t i = 0; i < frames; ++i) {
    const float mic = std::isfinite(micPending_[i]) ? micPending_[i] : 0.0f;
    const float mixed = softClip(aiPending_[i] + mic);
    pcm_[i] = static_cast<int16_t>(std::lrintf(mixed * 32767.0f));
    activitySumSquares_ += static_cast<double>(mixed) * mixed;
    if (++activityFrames_ == kActivityWindowFrames) {
      const double rms = std::sqrt(activitySumSquares_ / static_cast<double>(kActivityWindowFrames));
      activity_.push_back(rms >= kActivityRmsThreshold ? '1' : '0');
      activitySumSquares_ = 0.0;
      activityFrames_ = 0;
    }
  }
  aiPending_.erase(aiPending_.begin(), aiPending_.begin() + static_cast<ptrdiff_t>(frames));
  micPending_.erase(micPending_.begin(), micPending_.begin() + static_cast<ptrdiff_t>(frames));
  const size_t written = std::fwrite(pcm_.data(), sizeof(int16_t), frames, file_);
  framesWritten_.fetch_add(written, std::memory_order_release);
}

void CallRecorder::patchHeader() {
  if (file_ == nullptr) return;
  const uint64_t frames = framesWritten();
  uint8_t header[kWavHeaderBytes];
  writeWavHeader(header, options_.outputSampleRate, static_cast<uint32_t>(frames * 2));
  std::fflush(file_);
  if (std::fseek(file_, 0, SEEK_SET) == 0) {
    std::fwrite(header, 1, kWavHeaderBytes, file_);
  }
  std::fseek(file_, 0, SEEK_END);
  lastHeaderFrames_ = frames;
}

std::optional<CallRecordingResult> CallRecorder::stop() {
  if (!recording_.exchange(false, std::memory_order_acq_rel)) return std::nullopt;
  {
    std::lock_guard lock(wakeMutex_);
    stopWriter_ = true;
  }
  wakeCv_.notify_all();
  if (writer_.joinable()) writer_.join();

  std::lock_guard lock(pumpMutex_);
  if (file_ == nullptr) return std::nullopt;
  // Wait out a render callback still inside pushAI before the final drain.
  while (producerBusy_.load(std::memory_order_acquire)) std::this_thread::yield();
  pumpLocked(options_.spawnWriter ? steadyNowMs() : lastAiAtMs_, true);
  patchHeader();
  std::fclose(file_);
  file_ = nullptr;
  return CallRecordingResult{path_, recordingMs(), activity_};
}

// --- Process-wide recorder ---------------------------------------------------

namespace {

std::mutex gRecorderMutex;
std::shared_ptr<CallRecorder> gRecorder;
// Hazard pair for the render thread: it bumps gRenderUsers before reading
// gActiveRecorder, so stop can clear the pointer and wait for zero users
// before the recorder is finalised. All seq_cst on purpose (store/load order).
std::atomic<CallRecorder *> gActiveRecorder{nullptr};
std::atomic<uint32_t> gRenderUsers{0};

void recorderRenderTap(
    uint64_t sourceId,
    uint32_t sampleRate,
    const float *samples,
    size_t count) noexcept {
  gRenderUsers.fetch_add(1);
  if (CallRecorder *recorder = gActiveRecorder.load()) {
    recorder->pushAI(sourceId, sampleRate, samples, count);
  }
  gRenderUsers.fetch_sub(1);
}

} // namespace

bool startGlobalCallRecording(const std::string &path) {
  std::lock_guard lock(gRecorderMutex);
  if (gRecorder) return false;
  auto recorder = std::make_shared<CallRecorder>();
  if (!recorder->start(path)) return false;
  gRecorder = recorder;
  setRenderTap(&recorderRenderTap);
  gActiveRecorder.store(recorder.get());
  return true;
}

void pushGlobalCallRecordingMic(const float *samples, size_t count) {
  std::lock_guard lock(gRecorderMutex);
  if (gRecorder) gRecorder->pushMic(samples, count);
}

double globalCallRecordingMs() {
  std::lock_guard lock(gRecorderMutex);
  return gRecorder ? gRecorder->recordingMs() : 0.0;
}

std::optional<CallRecordingResult> stopGlobalCallRecording() {
  std::shared_ptr<CallRecorder> recorder;
  {
    std::lock_guard lock(gRecorderMutex);
    if (!gRecorder) return std::nullopt;
    gActiveRecorder.store(nullptr);
    while (gRenderUsers.load() != 0) std::this_thread::yield();
    recorder = std::move(gRecorder);
  }
  return recorder->stop();
}

} // namespace mementovoice
