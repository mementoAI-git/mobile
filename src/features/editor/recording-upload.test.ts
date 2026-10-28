import { expect, test } from 'bun:test';
import { buildRecordingUpload } from './recording-upload';
test('keeps the canonical audio MIME and exact recording bytes in multipart form', () => {
  const audio = new Uint8Array([0, 255, 128, 13, 10]);
  const bytes = new Uint8Array(buildRecordingUpload(audio, 'test-boundary'));
  const header = new TextEncoder().encode('--test-boundary\r\nContent-Disposition: form-data; name="file"; filename="story-recording.m4a"\r\nContent-Type: audio/mp4\r\n\r\n');
  expect(bytes.slice(0, header.length)).toEqual(header);
  expect(bytes.slice(header.length, header.length + audio.length)).toEqual(audio);
  expect(new TextDecoder().decode(bytes.slice(header.length + audio.length))).toBe('\r\n--test-boundary--\r\n');
});
