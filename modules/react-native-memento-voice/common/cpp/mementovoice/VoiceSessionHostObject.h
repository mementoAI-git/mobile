#pragma once

#include <audioapi/compatibility/StableAPI.h>

#include <memory>

#include "VoicePlaybackSession.h"
#include "VoiceStreamingNode.h"

namespace mementovoice {

class VoiceSessionHostObject final : public facebook::jsi::HostObject {
 public:
  VoiceSessionHostObject(
      const std::shared_ptr<audioapi::BaseAudioContext> &context,
      const std::shared_ptr<audioapi::AudioNodeHostObject> &destination,
      PlaybackOptions options);
  ~VoiceSessionHostObject() override;

  facebook::jsi::Value get(
      facebook::jsi::Runtime &runtime,
      const facebook::jsi::PropNameID &name) override;

 private:
  facebook::jsi::Value nodeValue(facebook::jsi::Runtime &runtime);
  std::shared_ptr<VoicePlaybackSession> session_;
  std::shared_ptr<audioapi::AudioNodeHostObject> nodeHost_;
  uint64_t generation_ = 1;
};

void installVoicePlaybackBindings(facebook::jsi::Runtime &runtime);

} // namespace mementovoice