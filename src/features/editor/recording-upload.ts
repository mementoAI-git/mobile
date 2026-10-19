/** Send bytes directly: iOS URI-based multipart uploads override audio/mp4 with audio/x-m4a. */
export function buildRecordingUpload(audio: Uint8Array, boundary: string) {
  const encoder = new TextEncoder();
  const prefix = encoder.encode(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="story-recording.m4a"\r\nContent-Type: audio/mp4\r\n\r\n`);
  const suffix = encoder.encode(`\r\n--${boundary}--\r\n`);
  const body = new Uint8Array(prefix.length + audio.length + suffix.length);
  body.set(prefix); body.set(audio, prefix.length); body.set(suffix, prefix.length + audio.length);
  return body.buffer;
}
