#include "VoiceStreamingNode.h"

namespace mementovoice {
namespace {

audioapi::AudioNodeOptions makeOptions() {
  audioapi::AudioNodeOptions options;
  options.numberOfInputs = 0;
  options.numberOfOutputs = 1;
  options.channelCount = 1;
  options.channelCountMode = audioapi::ChannelCountMode::EXPLICIT;
  options.channelInterpretation = audioapi::ChannelInterpretation::DISCRETE;
  return options;
}

} // namespace

VoiceStreamingNode::VoiceStreamingNode(
    const std::shared_ptr<audioapi::BaseAudioContext> &context,
    std::shared_ptr<VoicePlaybackSession> session)
    : AudioNode(context, makeOptions()), session_(std::move(session)) {}

void VoiceStreamingNode::processNode(int framesToProcess) {
  auto *output = audioBuffer_->getChannel(0)->begin();
  session_->render(output, static_cast<size_t>(framesToProcess));
}

} // namespace mementovoice