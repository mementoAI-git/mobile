#include "VoicePlaybackSession.h"

#include <algorithm>
#include <cmath>
#include <cstring>

namespace mementovoice {
namespace {

int decodeBase64Character(unsigned char value) {
  if (value >= 'A' && value <= 'Z') return value - 'A';
  if (value >= 'a' && value <= 'z') return value - 'a' + 26;
  if (value >= '0' && value <= '9') return value - '0' + 52;
  if (value == '+') return 62;
  if (value == '/') return 63;
  return -1;
}

} // namespace

VoicePlaybackSession::VoicePlaybackSession(PlaybackOptions options) : options_(options) {
  worker_ = std::thread([this] { workerLoop(); });
}

VoicePlaybackSession::~VoicePlaybackSession() {
  if (!stopped_.exchange(true, std::memory_order_acq_rel)) {
    state_.store(PlaybackState::Stopped, std::memory_order_release);
    {
      std::lock_guard lock(ingressMutex_);
      pendingChunks_.fetch_sub(ingress_.size(), std::memory_order_relaxed);
      ingress_.clear();
    }
    ingressCv_.notify_all();
  }
  if (worker_.joinable()) worker_.join();
}

void VoicePlaybackSession::start(uint64_t generation, uint64_t epoch) {
  if (stopped_.load(std::memory_order_acquire)) return;
  generation_.store(generation, std::memory_order_release);
  epoch_.store(epoch, std::memory_order_release);
  turnOpen_.store(false, std::memory_order_release);
  flushRequested_.store(false, std::memory_order_release);
  state_.store(PlaybackState::Idle, std::memory_order_release);
}

bool VoicePlaybackSession::pushPCM(
    std::string payload,
    uint64_t generation,
    uint64_t epoch,
    uint64_t sequence) {
  if (stopped_.load(std::memory_order_acquire) ||
      generation != generation_.load(std::memory_order_acquire) ||
      epoch != epoch_.load(std::memory_order_acquire)) {
    staleChunkCount_.fetch_add(1, std::memory_order_relaxed);
    return false;
  }
  if (bufferedFrames() >= thresholdFrames(options_.maxBufferedMs)) {
    overflowCount_.fetch_add(1, std::memory_order_relaxed);
    return false;
  }

  {
    std::lock_guard lock(ingressMutex_);
    if (stopped_.load(std::memory_order_acquire) ||
        generation != generation_.load(std::memory_order_acquire) ||
        epoch != epoch_.load(std::memory_order_acquire)) {
      staleChunkCount_.fetch_add(1, std::memory_order_relaxed);
      return false;
    }
    if (ingress_.size() >= kMaxIngressChunks) {
      overflowCount_.fetch_add(1, std::memory_order_relaxed);
      return false;
    }
    ingress_.push_back({std::move(payload), generation, epoch, sequence});
    pendingChunks_.fetch_add(1, std::memory_order_relaxed);
    turnOpen_.store(true, std::memory_order_release);
    flushRequested_.store(false, std::memory_order_release);
    if (state_.load(std::memory_order_acquire) == PlaybackState::Idle) {
      state_.store(PlaybackState::Priming, std::memory_order_release);
    }
  }
  ingressCv_.notify_one();
  return true;
}

void VoicePlaybackSession::flushTurn(uint64_t generation, uint64_t epoch) {
  {
    std::lock_guard lock(ingressMutex_);
    if (stopped_.load(std::memory_order_acquire) ||
        generation != generation_.load(std::memory_order_acquire) ||
        epoch != epoch_.load(std::memory_order_acquire)) {
      return;
    }
    turnOpen_.store(false, std::memory_order_release);
    flushRequested_.store(true, std::memory_order_release);
  }
  if (pendingChunks_.load(std::memory_order_acquire) == 0) finalizeFlushedTurn();
}

void VoicePlaybackSession::interrupt(uint64_t generation, uint64_t nextEpoch) {
  if (generation != generation_.load(std::memory_order_acquire)) return;
  {
    std::lock_guard lock(ingressMutex_);
    if (generation != generation_.load(std::memory_order_acquire)) return;
    epoch_.store(nextEpoch, std::memory_order_release);
    turnOpen_.store(false, std::memory_order_release);
    flushRequested_.store(false, std::memory_order_release);
    state_.store(PlaybackState::Idle, std::memory_order_release);
    pendingChunks_.fetch_sub(ingress_.size(), std::memory_order_relaxed);
    ingress_.clear();
  }
  ingressCv_.notify_one();
}

void VoicePlaybackSession::stop(uint64_t generation) {
  if (generation != generation_.load(std::memory_order_acquire) ||
      stopped_.exchange(true, std::memory_order_acq_rel)) {
    return;
  }
  state_.store(PlaybackState::Stopped, std::memory_order_release);
  {
    std::lock_guard lock(ingressMutex_);
    pendingChunks_.fetch_sub(ingress_.size(), std::memory_order_relaxed);
    ingress_.clear();
  }
  ingressCv_.notify_all();
  if (worker_.joinable()) worker_.join();
}

size_t VoicePlaybackSession::render(
    float *output,
    size_t frameCount) noexcept {
  std::memset(output, 0, frameCount * sizeof(float));
  if (stopped_.load(std::memory_order_acquire)) {
    return 0;
  }

  const uint64_t activeGeneration = generation_.load(std::memory_order_acquire);
  const uint64_t activeEpoch = epoch_.load(std::memory_order_acquire);
  while (true) {
    const uint64_t read = readBlock_.load(std::memory_order_relaxed);
    const uint64_t write = writeBlock_.load(std::memory_order_acquire);
    if (read == write) break;
    auto &block = blocks_[read % kBlockCount];
    if (block.generation == activeGeneration && block.epoch == activeEpoch) break;

    const size_t remaining = block.frameCount - renderOffset_;
    droppedFrames_.fetch_add(remaining, std::memory_order_relaxed);
    queuedFrames_.fetch_sub(remaining, std::memory_order_relaxed);
    renderOffset_ = 0;
    readBlock_.store(read + 1, std::memory_order_release);
  }

  auto state = state_.load(std::memory_order_acquire);
  const uint64_t available = bufferedFrames();
  if (state == PlaybackState::Priming && available >= thresholdFrames(options_.startupBufferMs)) {
    state = PlaybackState::Playing;
    state_.store(state, std::memory_order_release);
  } else if (state == PlaybackState::Recovering &&
             available >= thresholdFrames(options_.recoveryBufferMs)) {
    state = PlaybackState::Playing;
    state_.store(state, std::memory_order_release);
  }
  if (state != PlaybackState::Playing && state != PlaybackState::Draining) return 0;

  size_t written = 0;
  while (written < frameCount) {
    const uint64_t read = readBlock_.load(std::memory_order_relaxed);
    const uint64_t write = writeBlock_.load(std::memory_order_acquire);
    if (read == write) break;

    auto &block = blocks_[read % kBlockCount];
    if (block.generation != activeGeneration || block.epoch != activeEpoch) {
      const size_t remaining = block.frameCount - renderOffset_;
      droppedFrames_.fetch_add(remaining, std::memory_order_relaxed);
      queuedFrames_.fetch_sub(remaining, std::memory_order_relaxed);
      renderOffset_ = 0;
      readBlock_.store(read + 1, std::memory_order_release);
      continue;
    }

    const size_t remaining = block.frameCount - renderOffset_;
    const size_t amount = std::min(remaining, frameCount - written);
    std::memcpy(output + written, block.samples.data() + renderOffset_, amount * sizeof(float));
    renderOffset_ += amount;
    written += amount;
    queuedFrames_.fetch_sub(amount, std::memory_order_relaxed);
    renderedFrames_.fetch_add(amount, std::memory_order_relaxed);
    if (renderOffset_ == block.frameCount) {
      renderOffset_ = 0;
      readBlock_.store(read + 1, std::memory_order_release);
    }
  }

  if (written < frameCount) {
    if (turnOpen_.load(std::memory_order_acquire)) {
      underrunCount_.fetch_add(1, std::memory_order_relaxed);
      state_.store(PlaybackState::Recovering, std::memory_order_release);
    } else {
      state_.store(PlaybackState::Idle, std::memory_order_release);
    }
  }
  return written;
}

PlaybackSnapshot VoicePlaybackSession::snapshot() const noexcept {
  const auto frames = bufferedFrames();
  const auto state = state_.load(std::memory_order_acquire);
  return {
      state,
      generation_.load(std::memory_order_acquire),
      epoch_.load(std::memory_order_acquire),
      static_cast<double>(frames) * 1000.0 / options_.targetSampleRate,
      receivedFrames_.load(std::memory_order_relaxed),
      convertedFrames_.load(std::memory_order_relaxed),
      renderedFrames_.load(std::memory_order_relaxed),
      droppedFrames_.load(std::memory_order_relaxed),
      underrunCount_.load(std::memory_order_relaxed),
      overflowCount_.load(std::memory_order_relaxed),
      staleChunkCount_.load(std::memory_order_relaxed),
      sequenceGapCount_.load(std::memory_order_relaxed),
      malformedChunkCount_.load(std::memory_order_relaxed),
      state == PlaybackState::Playing || state == PlaybackState::Draining};
}

void VoicePlaybackSession::workerLoop() {
  while (true) {
    IngressChunk chunk;
    {
      std::unique_lock lock(ingressMutex_);
      ingressCv_.wait(lock, [this] { return stopped_.load(std::memory_order_acquire) || !ingress_.empty(); });
      if (stopped_.load(std::memory_order_acquire)) return;
      chunk = std::move(ingress_.front());
      ingress_.pop_front();
    }
    processChunk(chunk);
    const uint64_t pendingBefore = pendingChunks_.fetch_sub(1, std::memory_order_acq_rel);
    if (pendingBefore == 1 && flushRequested_.load(std::memory_order_acquire)) {
      finalizeFlushedTurn();
    }
  }
}

void VoicePlaybackSession::processChunk(const IngressChunk &chunk) {
  if (stopped_.load(std::memory_order_acquire) ||
      chunk.generation != generation_.load(std::memory_order_acquire) ||
      chunk.epoch != epoch_.load(std::memory_order_acquire)) {
    staleChunkCount_.fetch_add(1, std::memory_order_relaxed);
    return;
  }
  if (chunk.generation != converterGeneration_ || chunk.epoch != converterEpoch_) {
    resetConverter();
    converterGeneration_ = chunk.generation;
    converterEpoch_ = chunk.epoch;
    hasLastSequence_ = false;
  }
  if (hasLastSequence_) {
    if (chunk.sequence <= lastSequence_) {
      staleChunkCount_.fetch_add(1, std::memory_order_relaxed);
      return;
    }
    if (chunk.sequence > lastSequence_ + 1) {
      sequenceGapCount_.fetch_add(chunk.sequence - lastSequence_ - 1, std::memory_order_relaxed);
    }
  }
  hasLastSequence_ = true;
  lastSequence_ = chunk.sequence;
  std::vector<float> samples;
  if (!decodeBase64Pcm16(chunk.payload, samples)) {
    malformedChunkCount_.fetch_add(1, std::memory_order_relaxed);
    return;
  }
  receivedFrames_.fetch_add(samples.size(), std::memory_order_relaxed);
  resampleAndPublish(samples, chunk.generation, chunk.epoch, chunk.sequence);
}

void VoicePlaybackSession::finalizeFlushedTurn() noexcept {
  if (!flushRequested_.exchange(false, std::memory_order_acq_rel)) return;
  const auto state = state_.load(std::memory_order_acquire);
  if (bufferedFrames() > 0) {
    state_.store(
        state == PlaybackState::Priming ? PlaybackState::Playing : PlaybackState::Draining,
        std::memory_order_release);
  } else {
    state_.store(PlaybackState::Idle, std::memory_order_release);
  }
}

bool VoicePlaybackSession::decodeBase64Pcm16(
    const std::string &payload,
    std::vector<float> &samples) {
  std::vector<uint8_t> bytes;
  bytes.reserve((payload.size() * 3) / 4);
  uint32_t accumulator = 0;
  int bits = 0;
  for (unsigned char value : payload) {
    if (value == '=') break;
    const int decoded = decodeBase64Character(value);
    if (decoded < 0) return false;
    accumulator = (accumulator << 6) | static_cast<uint32_t>(decoded);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push_back(static_cast<uint8_t>((accumulator >> bits) & 0xff));
    }
  }
  if (bytes.empty() || bytes.size() % 2 != 0) return false;
  samples.resize(bytes.size() / 2);
  for (size_t index = 0; index < samples.size(); ++index) {
    const uint16_t raw = static_cast<uint16_t>(bytes[index * 2]) |
        (static_cast<uint16_t>(bytes[index * 2 + 1]) << 8);
    samples[index] = static_cast<float>(static_cast<int16_t>(raw)) / 32768.0f;
  }
  return true;
}

void VoicePlaybackSession::resampleAndPublish(
    const std::vector<float> &input,
    uint64_t generation,
    uint64_t epoch,
    uint64_t sequence) {
  if (input.empty()) return;
  std::vector<float> source;
  source.reserve(input.size() + 1);
  if (hasPreviousSample_) source.push_back(previousSample_);
  source.insert(source.end(), input.begin(), input.end());
  const double step = static_cast<double>(options_.sourceSampleRate) / options_.targetSampleRate;
  std::array<float, kBlockFrames> output{};
  size_t outputCount = 0;

  while (sourcePosition_ + 1.0 < static_cast<double>(source.size())) {
    const size_t lower = static_cast<size_t>(sourcePosition_);
    const double fraction = sourcePosition_ - static_cast<double>(lower);
    output[outputCount++] = source[lower] +
        static_cast<float>((source[lower + 1] - source[lower]) * fraction);
    sourcePosition_ += step;
    if (outputCount == output.size()) {
      if (!publishBlock(output.data(), outputCount, generation, epoch, sequence)) return;
      outputCount = 0;
    }
  }
  if (outputCount > 0) publishBlock(output.data(), outputCount, generation, epoch, sequence);

  sourcePosition_ -= static_cast<double>(source.size() - 1);
  previousSample_ = source.back();
  hasPreviousSample_ = true;
}

bool VoicePlaybackSession::publishBlock(
    const float *samples,
    size_t frameCount,
    uint64_t generation,
    uint64_t epoch,
    uint64_t sequence) {
  if (stopped_.load(std::memory_order_acquire) ||
      generation != generation_.load(std::memory_order_acquire) ||
      epoch != epoch_.load(std::memory_order_acquire)) {
    staleChunkCount_.fetch_add(1, std::memory_order_relaxed);
    return false;
  }
  const uint64_t write = writeBlock_.load(std::memory_order_relaxed);
  const uint64_t read = readBlock_.load(std::memory_order_acquire);
  if (write - read >= kBlockCount || bufferedFrames() + frameCount > thresholdFrames(options_.maxBufferedMs)) {
    overflowCount_.fetch_add(1, std::memory_order_relaxed);
    droppedFrames_.fetch_add(frameCount, std::memory_order_relaxed);
    return false;
  }
  auto &block = blocks_[write % kBlockCount];
  block.generation = generation;
  block.epoch = epoch;
  block.sequence = sequence;
  block.frameCount = static_cast<uint32_t>(frameCount);
  std::memcpy(block.samples.data(), samples, frameCount * sizeof(float));
  queuedFrames_.fetch_add(frameCount, std::memory_order_relaxed);
  convertedFrames_.fetch_add(frameCount, std::memory_order_relaxed);
  writeBlock_.store(write + 1, std::memory_order_release);
  return true;
}

void VoicePlaybackSession::resetConverter() noexcept {
  sourcePosition_ = 0.0;
  hasPreviousSample_ = false;
  previousSample_ = 0.0f;
}

uint64_t VoicePlaybackSession::bufferedFrames() const noexcept {
  return queuedFrames_.load(std::memory_order_acquire);
}

uint64_t VoicePlaybackSession::thresholdFrames(uint32_t milliseconds) const noexcept {
  return static_cast<uint64_t>(options_.targetSampleRate) * milliseconds / 1000;
}

} // namespace mementovoice