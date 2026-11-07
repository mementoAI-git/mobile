#include "VoiceSessionHostObject.h"

#include <stdexcept>
#include <string>

namespace mementovoice {
using namespace facebook;

namespace {

const char *stateName(PlaybackState state) {
  switch (state) {
    case PlaybackState::Idle: return "idle";
    case PlaybackState::Priming: return "priming";
    case PlaybackState::Playing: return "playing";
    case PlaybackState::Recovering: return "recovering";
    case PlaybackState::Draining: return "draining";
    case PlaybackState::Stopped: return "stopped";
  }
}

uint64_t numberArg(const jsi::Value *args, size_t index, size_t count) {
  return index < count && args[index].isNumber() ? static_cast<uint64_t>(args[index].getNumber()) : 0;
}

} // namespace

VoiceSessionHostObject::VoiceSessionHostObject(
    const std::shared_ptr<audioapi::BaseAudioContext> &context,
    const std::shared_ptr<audioapi::AudioNodeHostObject> &destination,
    PlaybackOptions options)
    : session_(std::make_shared<VoicePlaybackSession>(options)) {
  auto node = std::make_unique<VoiceStreamingNode>(context, session_);
  nodeHost_ = std::make_shared<audioapi::AudioNodeHostObject>(
      context->getGraph(), std::move(node), [] {
        audioapi::AudioNodeOptions value;
        value.numberOfInputs = 0;
        value.numberOfOutputs = 1;
        value.channelCount = 1;
        value.channelCountMode = audioapi::ChannelCountMode::EXPLICIT;
        value.channelInterpretation = audioapi::ChannelInterpretation::DISCRETE;
        return value;
      }());
  auto connection = nodeHost_->connect(*destination);
  if (!connection.is_ok()) {
    throw std::runtime_error("Failed to connect native voice source to the audio destination.");
  }
}

VoiceSessionHostObject::~VoiceSessionHostObject() {
  nodeHost_->disconnect();
}

jsi::Value VoiceSessionHostObject::nodeValue(jsi::Runtime &runtime) {
  return jsi::Object::createFromHostObject(runtime, nodeHost_);
}

jsi::Value VoiceSessionHostObject::get(jsi::Runtime &runtime, const jsi::PropNameID &name) {
  const std::string property = name.utf8(runtime);
  if (property == "node") return nodeValue(runtime);
  if (property == "start") {
    return jsi::Function::createFromHostFunction(
        runtime, name, 2, [session = session_](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t count) {
          session->start(numberArg(args, 0, count), numberArg(args, 1, count));
          return jsi::Value::undefined();
        });
  }
  if (property == "pushPCM") {
    return jsi::Function::createFromHostFunction(
        runtime, name, 4, [session = session_](jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
          if (count < 4 || !args[0].isString()) return jsi::Value(false);
          return jsi::Value(session->pushPCM(
              args[0].getString(rt).utf8(rt),
              numberArg(args, 1, count),
              numberArg(args, 2, count),
              numberArg(args, 3, count)));
        });
  }
  if (property == "flushTurn") {
    return jsi::Function::createFromHostFunction(
        runtime, name, 2, [session = session_](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t count) {
          session->flushTurn(numberArg(args, 0, count), numberArg(args, 1, count));
          return jsi::Value::undefined();
        });
  }
  if (property == "interrupt") {
    return jsi::Function::createFromHostFunction(
        runtime, name, 2, [session = session_](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t count) {
          session->interrupt(numberArg(args, 0, count), numberArg(args, 1, count));
          return jsi::Value::undefined();
        });
  }
  if (property == "stop") {
    return jsi::Function::createFromHostFunction(
        runtime, name, 1, [session = session_](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t count) {
          session->stop(numberArg(args, 0, count));
          return jsi::Value::undefined();
        });
  }
  if (property == "getSnapshot") {
    return jsi::Function::createFromHostFunction(
        runtime, name, 0, [session = session_](jsi::Runtime &rt, const jsi::Value &, const jsi::Value *, size_t) {
          const auto snapshot = session->snapshot();
          jsi::Object result(rt);
          result.setProperty(rt, "state", stateName(snapshot.state));
          result.setProperty(rt, "generation", static_cast<double>(snapshot.generation));
          result.setProperty(rt, "epoch", static_cast<double>(snapshot.epoch));
          result.setProperty(rt, "bufferedMs", snapshot.bufferedMs);
          result.setProperty(rt, "receivedFrames", static_cast<double>(snapshot.receivedFrames));
          result.setProperty(rt, "convertedFrames", static_cast<double>(snapshot.convertedFrames));
          result.setProperty(rt, "renderedFrames", static_cast<double>(snapshot.renderedFrames));
          result.setProperty(rt, "droppedFrames", static_cast<double>(snapshot.droppedFrames));
          result.setProperty(rt, "underrunCount", static_cast<double>(snapshot.underrunCount));
          result.setProperty(rt, "overflowCount", static_cast<double>(snapshot.overflowCount));
          result.setProperty(rt, "staleChunkCount", static_cast<double>(snapshot.staleChunkCount));
          result.setProperty(rt, "sequenceGapCount", static_cast<double>(snapshot.sequenceGapCount));
          result.setProperty(rt, "malformedChunkCount", static_cast<double>(snapshot.malformedChunkCount));
          result.setProperty(rt, "isAudible", snapshot.isAudible);
          result.setProperty(rt, "adaptiveExtraMs", static_cast<double>(snapshot.adaptiveExtraMs));
          result.setProperty(rt, "concealedFrames", static_cast<double>(snapshot.concealedFrames));
          return result;
        });
  }
  return jsi::Value::undefined();
}

void installVoicePlaybackBindings(jsi::Runtime &runtime) {
  auto factory = jsi::Function::createFromHostFunction(
      runtime,
      jsi::PropNameID::forAscii(runtime, "__mementoCreateVoicePlaybackSession"),
      3,
      [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) -> jsi::Value {
        if (count < 3 || !args[0].isObject() || !args[1].isObject() || !args[2].isObject()) {
          throw jsi::JSError(rt, "Voice playback requires an AudioContext, destination, and options.");
        }
        auto contextHost = args[0].getObject(rt).getHostObject<audioapi::BaseAudioContextHostObject>(rt);
        auto destinationHost = args[1].getObject(rt).getHostObject<audioapi::AudioNodeHostObject>(rt);
        auto optionsObject = args[2].getObject(rt);
        PlaybackOptions options;
        options.targetSampleRate = static_cast<uint32_t>(contextHost->getContext()->getSampleRate());
        options.sourceSampleRate = static_cast<uint32_t>(optionsObject.getProperty(rt, "sourceSampleRate").getNumber());
        options.startupBufferMs = static_cast<uint32_t>(optionsObject.getProperty(rt, "startupBufferMs").getNumber());
        options.recoveryBufferMs = static_cast<uint32_t>(optionsObject.getProperty(rt, "recoveryBufferMs").getNumber());
        options.maxBufferedMs = static_cast<uint32_t>(optionsObject.getProperty(rt, "maxBufferedMs").getNumber());
        // Optional: a JS bundle older than this option leaves the ramp off.
        auto warmupRampMs = optionsObject.getProperty(rt, "warmupRampMs");
        if (warmupRampMs.isNumber()) {
          options.warmupRampMs = static_cast<uint32_t>(warmupRampMs.getNumber());
        }
        auto host = std::make_shared<VoiceSessionHostObject>(
            contextHost->getContext(), destinationHost, options);
        return jsi::Object::createFromHostObject(rt, host);
      });
  runtime.global().setProperty(runtime, "__mementoCreateVoicePlaybackSession", std::move(factory));
}

} // namespace mementovoice