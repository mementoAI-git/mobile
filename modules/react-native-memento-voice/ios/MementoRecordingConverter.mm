#import "MementoRecordingConverter.h"

#import <AVFoundation/AVFoundation.h>

NSErrorDomain const MementoRecordingErrorDomain = @"MementoRecording";

static NSError *MementoRecordingError(NSInteger code, NSString *message)
{
  return [NSError errorWithDomain:MementoRecordingErrorDomain
                             code:code
                         userInfo:@{NSLocalizedDescriptionKey : message}];
}

static AVAudioFile *_Nullable MementoOpenAacWriter(NSURL *url, double sampleRate, NSError **error)
{
  NSMutableDictionary *settings = [@{
    AVFormatIDKey : @(kAudioFormatMPEG4AAC),
    AVSampleRateKey : @(sampleRate),
    AVNumberOfChannelsKey : @1,
    AVEncoderBitRateKey : @32000,
  } mutableCopy];
  AVAudioFile *file = [[AVAudioFile alloc] initForWriting:url
                                                 settings:settings
                                             commonFormat:AVAudioPCMFormatFloat32
                                              interleaved:NO
                                                    error:error];
  if (file != nil) return file;
  // Some encoder builds reject an explicit bit rate at this sample rate; let
  // the encoder pick its default rather than failing the recording.
  [[NSFileManager defaultManager] removeItemAtURL:url error:nil];
  [settings removeObjectForKey:AVEncoderBitRateKey];
  return [[AVAudioFile alloc] initForWriting:url
                                    settings:settings
                                commonFormat:AVAudioPCMFormatFloat32
                                 interleaved:NO
                                       error:error];
}

NSString *MementoConvertRecordingToM4A(NSString *wavPath, NSError **error)
{
  NSString *path = wavPath;
  if ([path hasPrefix:@"file://"]) {
    path = [NSURL URLWithString:path].path ?: path;
  }
  NSFileManager *files = [NSFileManager defaultManager];
  if (path.length == 0 || ![files fileExistsAtPath:path]) {
    if (error) *error = MementoRecordingError(1, @"Recording file not found.");
    return nil;
  }

  NSURL *inputURL = [NSURL fileURLWithPath:path];
  NSString *outputPath = [[path stringByDeletingPathExtension] stringByAppendingPathExtension:@"m4a"];
  // Encode to a sibling first so a failed conversion never leaves a half
  // file under the final name.
  NSString *partialPath = [[path stringByDeletingPathExtension] stringByAppendingString:@".partial.m4a"];
  NSURL *partialURL = [NSURL fileURLWithPath:partialPath];
  [files removeItemAtPath:partialPath error:nil];

  @autoreleasepool {
    NSError *readError = nil;
    AVAudioFile *input = [[AVAudioFile alloc] initForReading:inputURL
                                                commonFormat:AVAudioPCMFormatFloat32
                                                 interleaved:NO
                                                       error:&readError];
    if (input == nil) {
      if (error) *error = readError ?: MementoRecordingError(2, @"Could not read the recording.");
      return nil;
    }
    if (input.length <= 0) {
      if (error) *error = MementoRecordingError(3, @"The recording is empty.");
      return nil;
    }
    AVAudioFormat *format = input.processingFormat;
    if (format.channelCount != 1) {
      if (error) *error = MementoRecordingError(4, @"Expected a mono recording.");
      return nil;
    }

    NSError *writeError = nil;
    AVAudioFile *output = MementoOpenAacWriter(partialURL, format.sampleRate, &writeError);
    if (output == nil) {
      if (error) *error = writeError ?: MementoRecordingError(5, @"Could not create the M4A file.");
      return nil;
    }

    const AVAudioFrameCount chunk = 8192;
    AVAudioPCMBuffer *buffer = [[AVAudioPCMBuffer alloc] initWithPCMFormat:format frameCapacity:chunk];
    while (input.framePosition < input.length) {
      if (![input readIntoBuffer:buffer frameCount:chunk error:&readError]) {
        output = nil;
        [files removeItemAtURL:partialURL error:nil];
        if (error) *error = readError ?: MementoRecordingError(2, @"Could not read the recording.");
        return nil;
      }
      if (buffer.frameLength == 0) break;
      if (![output writeFromBuffer:buffer error:&writeError]) {
        output = nil;
        [files removeItemAtURL:partialURL error:nil];
        if (error) *error = writeError ?: MementoRecordingError(6, @"Could not encode the recording.");
        return nil;
      }
    }
    // AVAudioFile finishes the AAC stream and writes the moov atom when it is
    // released; make that happen before the file is moved.
    output = nil;
  }

  [files removeItemAtPath:outputPath error:nil];
  NSError *moveError = nil;
  if (![files moveItemAtPath:partialPath toPath:outputPath error:&moveError]) {
    [files removeItemAtPath:partialPath error:nil];
    if (error) *error = moveError;
    return nil;
  }
  [files removeItemAtPath:path error:nil];
  return outputPath;
}
