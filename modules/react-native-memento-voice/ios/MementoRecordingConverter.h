#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/// Converts a call recording WAV to AAC M4A (mono, 16 kHz, ~32 kbps) next to
/// it, with the same name and an .m4a extension. Deletes the WAV on success.
/// Blocking: call it off the main thread.
/// @return The absolute M4A path, or nil with `error` set.
FOUNDATION_EXPORT NSString *_Nullable MementoConvertRecordingToM4A(
    NSString *wavPath,
    NSError *_Nullable *_Nullable error);

FOUNDATION_EXPORT NSErrorDomain const MementoRecordingErrorDomain;

NS_ASSUME_NONNULL_END
