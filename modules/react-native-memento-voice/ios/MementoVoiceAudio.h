#ifdef RCT_NEW_ARCH_ENABLED
#import <React/RCTInvalidating.h>
#import <ReactCodegen/mementovoiceaudio/mementovoiceaudio.h>
#else
#import <React/RCTBridgeModule.h>
#endif

#import <React/RCTEventEmitter.h>

@interface MementoVoiceAudio : RCTEventEmitter
#ifdef RCT_NEW_ARCH_ENABLED
                              <NativeMementoVoiceAudioSpec, RCTInvalidating>
#else
                              <RCTBridgeModule>
#endif
@end