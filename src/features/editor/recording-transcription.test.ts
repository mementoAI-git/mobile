import { expect, test } from 'bun:test';
import { RecordingTranscription } from './recording-transcription';

test('does not insert text while recording; a completed request inserts once', async () => {
  const session = new RecordingTranscription();
  const inserted: string[] = [];
  session.retain('file://voice.m4a');
  expect(inserted).toEqual([]);
  expect(await session.run(async () => ' Finished words ', async text => { inserted.push(text); })).toBe(true);
  expect(inserted).toEqual(['Finished words']);
  expect(session.uri).toBeNull();
  expect(await session.run(async () => 'duplicate', async text => { inserted.push(text); })).toBe(false);
});
test('network failure keeps the same recording for retry', async () => {
  const session = new RecordingTranscription(); session.retain('file://voice.m4a');
  await expect(session.run(async () => { throw new Error('offline'); }, async () => {})).rejects.toThrow('offline');
  expect(session.uri).toBe('file://voice.m4a');
  let received = '';
  await session.run(async uri => { received = uri; return 'Recovered'; }, async () => {});
  expect(received).toBe('file://voice.m4a');
});
test('cancelling an in-flight request ignores late results and retains audio', async () => {
  const session = new RecordingTranscription(); session.retain('file://voice.m4a');
  let resolve!: (text: string) => void;
  let inserts = 0;
  const pending = session.run(() => new Promise(r => { resolve = r; }), async () => { inserts++; });
  session.cancelRequest(); resolve('Late result');
  expect(await pending).toBe(false);
  expect(inserts).toBe(0);
  expect(session.uri).toBe('file://voice.m4a');
});
test('empty transcription preserves audio and failed insertion never consumes it', async () => {
  const session = new RecordingTranscription(); session.retain('file://voice.m4a');
  await expect(session.run(async () => '', async () => {})).rejects.toThrow('No speech');
  await expect(session.run(async () => 'words', async () => { throw new Error('editor closed'); })).rejects.toThrow('editor closed');
  expect(session.uri).toBe('file://voice.m4a');
});
