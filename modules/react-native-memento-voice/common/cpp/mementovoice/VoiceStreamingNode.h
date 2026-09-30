#pragma once

#include <audioapi/compatibility/StableAPI.h>

#include <cstdint>
#include <memory>

#include "VoicePlaybackSession.h"

namespace mementovoice {

class VoiceStreamingNode final : public audioapi::AudioNode {
 public:
  VoiceStreamingNode(
      const std::shared_ptr<audioapi::BaseAudioContext> &context,
      std::shared_ptr<VoicePlaybackSession> session);

 protected:
  void processNode(int framesToProcess) final;

 private:
  std::shared_ptr<VoicePlaybackSession> session_;
};

} // namespace mementovoice