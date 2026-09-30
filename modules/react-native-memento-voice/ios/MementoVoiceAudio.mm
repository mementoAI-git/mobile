#import "MementoVoiceAudio.h"

#import <React/RCTBridge+Private.h>

#include "VoiceSessionHostObject.h"

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

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeMementoVoiceAudioSpecJSI>(params);
}
#endif

@end