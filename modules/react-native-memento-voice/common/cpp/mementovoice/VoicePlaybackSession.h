#pragma once

#include <array>
#include <atomic>
#include <condition_variable>
#include <cstddef>
#include <cstdint>
#include <deque>
#include <memory>
#include <mutex>
#include <string>
#include <thread>
#include <vector>

namespace mementovoice {

enum class PlaybackState : uint8_t { Idle, Priming, Playing, Recovering, Draining, Stopped };

struct PlaybackOptions {
  uint32_t sourceSampleRate = 24000;
  uint32_t targetSampleRate = 48000;
  uint32_t startupBufferMs = 180;
  uint32_t recoveryBufferMs = 240;
  uint32_t maxBufferedMs = 5000;
};

struct PlaybackSnapshot {
  PlaybackState state;
  uint64_t generation;
  uint64_t epoch;
  double bufferedMs;
  uint64_t receivedFrames;
  uint64_t convertedFrames;
  uint64_t renderedFrames;
  uint64_t droppedFrames;
  uint64_t underrunCount;
  uint64_t overflowCount;
  uint64_t staleChunkCount;
  uint64_t sequenceGapCount;
  uint64_t malformedChunkCount;
  bool isAudible;
};

class VoicePlaybackSession : public std::enable_shared_from_this<VoicePlaybackSession> {
 public:
  explicit VoicePlaybackSession(PlaybackOptions options);
  ~VoicePlaybackSession();

  bool pushPCM(std::string payload, uint64_t generation, uint64_t epoch, uint64_t sequence);
  void start(uint64_t generation, uint64_t epoch);
  void flushTurn(uint64_t generation, uint64_t epoch);
  void interrupt(uint64_t generation, uint64_t nextEpoch);
  void stop(uint64_t generation);
  size_t render(float *output, size_t frameCount) noexcept;
  PlaybackSnapshot snapshot() const noexcept;

 private:
  static constexpr size_t kBlockFrames = 1024;
  static constexpr size_t kBlockCount = 256;
  static constexpr size_t kMaxIngressChunks = 128;

  struct IngressChunk {
    std::string payload;
    uint64_t generation;
    uint64_t epoch;
    uint64_t sequence;
  };

  struct AudioBlock {
    uint64_t generation = 0;
    uint64_t epoch = 0;
    uint64_t sequence = 0;
    uint32_t frameCount = 0;
    std::array<float, kBlockFrames> samples{};
  };

  void workerLoop();
  void processChunk(const IngressChunk &chunk);
  void finalizeFlushedTurn() noexcept;
  bool decodeBase64Pcm16(const std::string &payload, std::vector<float> &samples);
  void resampleAndPublish(
      const std::vector<float> &input,
      uint64_t generation,
      uint64_t epoch,
      uint64_t sequence);
  bool publishBlock(
      const float *samples,
      size_t frameCount,
      uint64_t generation,
      uint64_t epoch,
      uint64_t sequence);
  void resetConverter() noexcept;
  uint64_t bufferedFrames() const noexcept;
  uint64_t thresholdFrames(uint32_t milliseconds) const noexcept;

  PlaybackOptions options_;
  std::atomic<PlaybackState> state_{PlaybackState::Idle};
  std::atomic<uint64_t> generation_{1};
  std::atomic<uint64_t> epoch_{1};
  std::atomic<bool> turnOpen_{false};
  std::atomic<bool> flushRequested_{false};
  std::atomic<bool> stopped_{false};
  std::atomic<uint64_t> pendingChunks_{0};

  std::mutex ingressMutex_;
  std::condition_variable ingressCv_;
  std::deque<IngressChunk> ingress_;
  std::thread worker_;

  std::array<AudioBlock, kBlockCount> blocks_{};
  std::atomic<uint64_t> writeBlock_{0};
  std::atomic<uint64_t> readBlock_{0};
  size_t renderOffset_ = 0;

  // Worker-owned continuous linear resampler state.
  double sourcePosition_ = 0.0;
  bool hasPreviousSample_ = false;
  float previousSample_ = 0.0f;
  uint64_t converterGeneration_ = 0;
  uint64_t converterEpoch_ = 0;
  bool hasLastSequence_ = false;
  uint64_t lastSequence_ = 0;

  std::atomic<uint64_t> queuedFrames_{0};
  std::atomic<uint64_t> receivedFrames_{0};
  std::atomic<uint64_t> convertedFrames_{0};
  std::atomic<uint64_t> renderedFrames_{0};
  std::atomic<uint64_t> droppedFrames_{0};
  std::atomic<uint64_t> underrunCount_{0};
  std::atomic<uint64_t> overflowCount_{0};
  std::atomic<uint64_t> staleChunkCount_{0};
  std::atomic<uint64_t> sequenceGapCount_{0};
  std::atomic<uint64_t> malformedChunkCount_{0};
};

} // namespace mementovoice