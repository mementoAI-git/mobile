import { describe, expect, test } from 'bun:test';
import { buildRecordingSegments, CallRecordingSession, speechSpansFromActivity, USER_TRANSCRIPT_LAG_MS, type CallRecorderNative } from './call-recording';
import { audioOmittedReason, buildRecordingSaveBody, CallRecordingOutbox, RECORDING_OUTBOX_MAX_AGE_MS, recordingSavePath } from './call-recording-outbox';

function fakeNative() {
  const pushed: Float32Array[] = [];
  let ms = 0;
  const native: CallRecorderNative & { setMs(value: number): void } = {
    startRecording: () => true,
    pushMic: (buffer) => { pushed.push(new Float32Array(buffer)); },
    recordingMs: () => ms,
    stopRecording: () => ({ path: '/tmp/call.wav', durationMs: 20_000, activity: '0011100000' }),
    setMs: (value) => { ms = value; },
  };
  return { native, pushed };
}

describe('recording segments', () => {
  test('each turn runs until the next one starts, the last until the end', () => {
    const segments = buildRecordingSegments(
      [{ role: 'ai', text: 'Hello' }, { role: 'user', text: 'Hi there' }, { role: 'ai', text: 'How are you?' }],
      new Map([[0, 0], [1, 4_000], [2, 9_500]]),
      15_000,
    );
    expect(segments).toEqual([
      { start: 0, end: 4, text: 'Hello', speaker: 'ai' },
      { start: 4, end: 9.5, text: 'Hi there', speaker: 'user' },
      { start: 9.5, end: 15, text: 'How are you?', speaker: 'ai' },
    ]);
  });

  test('unseen turns follow the previous one, out-of-order times never go backwards, and empty turns drop', () => {
    const segments = buildRecordingSegments(
      [{ role: 'ai', text: 'One' }, { role: 'user', text: '  ' }, { role: 'user', text: 'Two' }, { role: 'ai', text: 'Three' }],
      new Map([[0, 2_000], [3, 1_000]]),
      30_000,
    );
    expect(segments.map((segment) => [segment.text, segment.start, segment.end])).toEqual([
      ['One', 2, 2],
      ['Two', 2, 2],
      ['Three', 2, 30],
    ]);
  });

  test('times are clamped to the recording', () => {
    const [segment] = buildRecordingSegments([{ role: 'ai', text: 'Late' }], new Map([[0, 99_000]]), 10_000);
    expect(segment).toMatchObject({ start: 10, end: 10 });
  });
});

describe('speech spans', () => {
  test('merges short pauses, drops blips, and converts 100 ms windows to seconds', () => {
    expect(speechSpansFromActivity(undefined)).toEqual([]);
    expect(speechSpansFromActivity('1100111000000001000011')).toEqual([{ start: 0, end: 0.7 }, { start: 2, end: 2.2 }]);
  });
});

describe('call recording session', () => {
  test('records silence while muted and notes each turn once, user turns moved back for transcription lag', () => {
    const { native, pushed } = fakeNative();
    const session = new CallRecordingSession(native);
    expect(session.start('/tmp/call.wav')).toBe(true);

    session.pushMic(new Float32Array([0.5, -0.5]), false);
    session.pushMic(new Float32Array([0.5, -0.5]), true);
    expect([...pushed[0]]).toEqual([0.5, -0.5]);
    expect([...pushed[1]]).toEqual([0, 0]);

    native.setMs(3_000);
    session.noteTurns([{ role: 'ai', text: 'Hello' }]);
    native.setMs(6_000);
    const turns = [{ role: 'ai' as const, text: 'Hello again' }, { role: 'user' as const, text: 'Hi' }];
    session.noteTurns(turns);

    const result = session.stop(turns);
    expect(result?.path).toBe('/tmp/call.wav');
    expect(result?.segments).toEqual([
      { start: 3, end: (6_000 - USER_TRANSCRIPT_LAG_MS) / 1000, text: 'Hello again', speaker: 'ai' },
      { start: (6_000 - USER_TRANSCRIPT_LAG_MS) / 1000, end: 20, text: 'Hi', speaker: 'user' },
    ]);
    expect(result?.speech).toEqual([{ start: 0.2, end: 0.5 }]);
    expect(session.stop(turns)).toBeNull();
  });

  test('does nothing when the native recorder could not start', () => {
    const { native, pushed } = fakeNative();
    native.startRecording = () => false;
    const session = new CallRecordingSession(native);
    expect(session.start('/tmp/x.wav')).toBe(false);
    session.pushMic(new Float32Array([1]), false);
    expect(pushed).toHaveLength(0);
    expect(session.stop([])).toBeNull();
  });
});

function memoryStorage() {
  const data = new Map<string, string>();
  return { getItem: async (key: string) => data.get(key) ?? null, setItem: async (key: string, value: string) => { data.set(key, value); } };
}

const entry = { sessionId: 's1', uri: 'file:///call.m4a', durationSeconds: 61.6, segments: [{ start: 0, end: 1, text: 'Hi', speaker: 'ai' as const }] };

describe('call recording outbox', () => {
  test('uploads once, saves, then deletes the local file and the entry', async () => {
    const outbox = new CallRecordingOutbox(memoryStorage(), 'u1');
    await outbox.add(entry);
    const calls: string[] = [];
    const sent = await outbox.drain({
      upload: async () => { calls.push('upload'); return 'f1'; },
      save: async (saved) => { calls.push(`save:${saved.fileId}`); },
      deleteFile: (uri) => { calls.push(`delete:${uri}`); },
    });
    expect(sent).toBe(1);
    expect(calls).toEqual(['upload', 'save:f1', 'delete:file:///call.m4a']);
    expect(await outbox.entries()).toEqual([]);
  });

  test('a failed save keeps the entry with its file id, so the retry does not upload again', async () => {
    const outbox = new CallRecordingOutbox(memoryStorage(), 'u1');
    await outbox.add(entry);
    let uploads = 0;
    await outbox.drain({ upload: async () => { uploads += 1; return 'f1'; }, save: async () => { throw new Error('offline'); }, deleteFile: () => {} });
    expect((await outbox.entries())[0].fileId).toBe('f1');
    const sent = await outbox.drain({ upload: async () => { uploads += 1; return 'f2'; }, save: async () => {}, deleteFile: () => {} });
    expect(sent).toBe(1);
    expect(uploads).toBe(1);
  });

  test('keeps the transcript of a recording too old to retry, then drops it', async () => {
    let now = 0;
    const outbox = new CallRecordingOutbox(memoryStorage(), 'u1', () => now);
    await outbox.add(entry);
    now = RECORDING_OUTBOX_MAX_AGE_MS + 1;
    const deleted: string[] = [];
    const saved: unknown[] = [];
    await outbox.drain({
      upload: async () => { throw new Error('should not upload'); },
      save: async (s) => { saved.push(s); },
      deleteFile: (uri) => { deleted.push(uri); },
    });
    expect(saved).toEqual([expect.objectContaining({ audioOmitted: 'upload_failed' })]);
    expect(deleted).toEqual(['file:///call.m4a']);
    expect(await outbox.entries()).toEqual([]);
  });

  test('drops an old recording with nothing said, without saving', async () => {
    let now = 0;
    const outbox = new CallRecordingOutbox(memoryStorage(), 'u1', () => now);
    await outbox.add({ ...entry, segments: [] });
    now = RECORDING_OUTBOX_MAX_AGE_MS + 1;
    let saves = 0;
    await outbox.drain({ upload: async () => 'f', save: async () => { saves += 1; }, deleteFile: () => {} });
    expect(saves).toBe(0);
    expect(await outbox.entries()).toEqual([]);
  });

  test('saves just the transcript when the audio is too large to upload', async () => {
    const outbox = new CallRecordingOutbox(memoryStorage(), 'u1');
    await outbox.add(entry);
    const calls: string[] = [];
    const sent = await outbox.drain({
      upload: async () => { calls.push('upload'); throw { httpStatus: 413, code: 'payload_too_large' }; },
      save: async (s) => { calls.push(`save:${s.fileId ?? s.audioOmitted}`); },
      deleteFile: (uri) => { calls.push(`delete:${uri}`); },
    });
    expect(sent).toBe(1);
    expect(calls).toEqual(['upload', 'save:too_large', 'delete:file:///call.m4a']);
    expect(await outbox.entries()).toEqual([]);
  });

  test('saves just the transcript when storage is full', async () => {
    const outbox = new CallRecordingOutbox(memoryStorage(), 'u1');
    await outbox.add(entry);
    const saved: string[] = [];
    await outbox.drain({
      upload: async () => { throw { httpStatus: 403, code: 'storage_quota_exceeded' }; },
      save: async (s) => { saved.push(String(s.audioOmitted)); },
      deleteFile: () => {},
    });
    expect(saved).toEqual(['storage_full']);
  });

  test('keeps retrying the upload after a passing failure', async () => {
    const outbox = new CallRecordingOutbox(memoryStorage(), 'u1');
    await outbox.add(entry);
    let saves = 0;
    const sent = await outbox.drain({
      upload: async () => { throw { httpStatus: 503 }; },
      save: async () => { saves += 1; },
      deleteFile: () => {},
    });
    expect(sent).toBe(0);
    expect(saves).toBe(0);
    expect(await outbox.entries()).toHaveLength(1);
  });

  test('once the audio is given up on, a retry saves the transcript without uploading again', async () => {
    const outbox = new CallRecordingOutbox(memoryStorage(), 'u1');
    await outbox.add(entry);
    let uploads = 0;
    await outbox.drain({
      upload: async () => { uploads += 1; throw { httpStatus: 413 }; },
      save: async () => { throw new Error('offline'); },
      deleteFile: () => {},
    });
    expect((await outbox.entries())[0].audioOmitted).toBe('too_large');
    const sent = await outbox.drain({ upload: async () => { uploads += 1; return 'f'; }, save: async () => {}, deleteFile: () => {} });
    expect(sent).toBe(1);
    expect(uploads).toBe(1);
  });

  test('tells final upload failures from passing ones', () => {
    expect(audioOmittedReason({ httpStatus: 413 })).toBe('too_large');
    expect(audioOmittedReason({ code: 'payload_too_large' })).toBe('too_large');
    expect(audioOmittedReason({ httpStatus: 403, code: 'storage_quota_exceeded' })).toBe('storage_full');
    expect(audioOmittedReason({ httpStatus: 503 })).toBeNull();
    expect(audioOmittedReason(new Error('Network Error'))).toBeNull();
  });

  test('builds the save request', () => {
    expect(recordingSavePath('a b')).toBe('/ai/voice/calls/a%20b/recording');
    expect(buildRecordingSaveBody({ ...entry, fileId: 'f1' })).toEqual({ file_id: 'f1', duration_seconds: 62, segments: entry.segments });
    expect(buildRecordingSaveBody({ ...entry, speech: [{ start: 0, end: 1 }], fileId: 'f1' }).speech).toEqual([{ start: 0, end: 1 }]);
    expect(buildRecordingSaveBody({ ...entry, audioOmitted: 'storage_full' })).toEqual({
      audio_omitted: 'storage_full',
      duration_seconds: 62,
      segments: entry.segments,
    });
  });
});
