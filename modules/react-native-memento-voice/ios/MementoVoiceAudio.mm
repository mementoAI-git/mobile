#import "MementoVoiceAudio.h"

#import <React/RCTBridge+Private.h>

#include "VoiceSessionHostObject.h"

#import "MementoRecordingConverter.h"

#import <audioapi/ios/system/AudioEngine.h>

@interface RCTBridge (MementoVoiceJSIRuntime)
- (void *)runtime;
@end

@implementation MementoVoiceAudio

RCT_EXPORT_MODULE(MementoVoiceAudio);

- (NSArray<NSString *> *)supportedEvents
{
  return @[];
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(install)
{
  auto *runtime = reinterpret_cast<facebook::jsi::Runtime *>(self.bridge.runtime);
  if (runtime == nullptr) {
    return @NO;
  }
  mementovoice::installVoicePlaybackBindings(*runtime);
  return @YES;
}

// What iOS reports, not what the app requested: the voice-processing setter
// can fail (the audio library only logs it), and full duplex on the
// loudspeaker is only safe while echo cancellation is really on.
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(isVoiceProcessingActive)
{
  AudioEngine *engine = [AudioEngine sharedInstance];
  // Only read the system input once a recorder is attached; reading
  // `inputNode` otherwise would pull the microphone into the engine.
  if (engine == nil || engine.audioEngine == nil || engine.inputNode == nil) {
    return @NO;
  }
  return engine.audioEngine.inputNode.isVoiceProcessingEnabled ? @YES : @NO;
}

// WAV call recording -> AAC M4A (mono, 16 kHz, ~32 kbps) beside it; the WAV
// is deleted on success. Encodes on a background queue.
RCT_EXPORT_METHOD(convertRecordingToM4A
                  : (NSString *)wavPath resolve
                  : (RCTPromiseResolveBlock)resolve reject
                  : (RCTPromiseRejectBlock)reject)
{
  NSString *path = [wavPath copy];
  dispatch_async(dispatch_get_global_queue(QOS_CLASS_UTILITY, 0), ^{
    NSError *error = nil;
    NSString *output = MementoConvertRecordingToM4A(path, &error);
    if (output != nil) {
      resolve(output);
    } else {
      reject(@"E_RECORDING_CONVERT",
             error.localizedDescription ?: @"Could not convert the recording.",
             error);
    }
  });
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeMementoVoiceAudioSpecJSI>(params);
}
#endif

@end