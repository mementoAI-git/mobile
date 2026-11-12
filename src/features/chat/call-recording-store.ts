import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { convertRecordingToM4A, getNativeVoiceRecorder } from 'react-native-memento-voice';

import client from '@/api/client';
import endpoint from '@/api/endpoint';
import { post } from '@/api/mutations';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/constants/query-keys';
import { logger } from '@/lib/logger';
import type { CallRecorderNative, RecordingSegment, SpeechSpan } from './call-recording';
import {
  buildRecordingSaveBody,
  CallRecordingOutbox,
  recordingSavePath,
  type RecordingOutboxEntry,
  type RecordingToSave,
} from './call-recording-outbox';

/** The native recorder, on builds that have it (iOS only for now). */
export function getCallRecorderNative(): CallRecorderNative | null {
  if (Platform.OS !== 'ios') return null;
  try {
    return getNativeVoiceRecorder();
  } catch {
    return null;
  }
}

/** A plain filesystem path for the native recorder (no file:// scheme). */
export function newCallRecordingPath(sessionId: string) {
  const name = `voice_call_${sessionId.replace(/[^\w-]/g, '')}.wav`;
  return decodeURI(new File(Paths.document, name).uri.replace(/^file:\/\//, ''));
}

const outboxes = new Map<string, CallRecordingOutbox>();

function getCallRecordingOutbox(userId: string) {
  let outbox = outboxes.get(userId);
  if (!outbox) {
    outbox = new CallRecordingOutbox(AsyncStorage, userId);
    outboxes.set(userId, outbox);
  }
  return outbox;
}

function toUri(path: string) {
  return path.startsWith('file://') ? path : `file://${encodeURI(path)}`;
}

function deleteFile(uri: string) {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Already gone.
  }
}

async function upload(entry: RecordingOutboxEntry): Promise<string> {
  const isM4A = entry.uri.endsWith('.m4a');
  const form = new FormData();
  form.append('file', {
    uri: entry.uri,
    type: isM4A ? 'audio/m4a' : 'audio/wav',
    // `voice_` + m4a marks it as a voice recording across the app.
    name: `voice_call_${Date.now()}.${isM4A ? 'm4a' : 'wav'}`,
  } as any);
  form.append('duration', String(Math.round(entry.durationSeconds)));
  const response = await client.post<{ data: { _id: string } | Array<{ _id: string }> }>(endpoint.upload, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120_000,
  });
  const data = response.data.data;
  const file = Array.isArray(data) ? data[0] : data;
  if (!file?._id) throw new Error('The recording upload returned no file.');
  return file._id;
}

async function save(entry: RecordingToSave) {
  await post(recordingSavePath(entry.sessionId), buildRecordingSaveBody(entry));
  void queryClient.invalidateQueries({ queryKey: queryKeys.memories() });
}

/** Sends recordings earlier calls left on the device. */
export function drainCallRecordings(userId: string) {
  return getCallRecordingOutbox(userId).drain({ upload, save, deleteFile });
}

/**
 * Keeps a finished call's recording and saves it as a story: compressed to
 * M4A, written to the outbox first (so nothing is lost), then sent.
 * Resolves `sent` once the story is saved, or `queued` when it is kept on the
 * device for the next send (offline, or another send already running).
 */
export async function finishCallRecording({
  userId,
  sessionId,
  recording,
}: {
  userId: string;
  sessionId: string;
  recording: { path: string; durationMs: number; segments: RecordingSegment[]; speech: SpeechSpan[] };
}): Promise<'sent' | 'queued'> {
  let path = recording.path;
  try {
    path = await convertRecordingToM4A(recording.path);
  } catch (error) {
    // The WAV still uploads; it is just larger.
    logger.handledError('Voice recording could not be compressed', error);
  }
  const outbox = getCallRecordingOutbox(userId);
  await outbox.add({
    sessionId,
    uri: toUri(path),
    durationSeconds: recording.durationMs / 1000,
    segments: recording.segments,
    speech: recording.speech,
  });
  await drainCallRecordings(userId);
  const pending = (await outbox.entries()).some((entry) => entry.sessionId === sessionId);
  return pending ? 'queued' : 'sent';
}

/** Removes a recording that will not be kept (an empty or very short call). */
export function discardCallRecording(path: string) {
  deleteFile(toUri(path));
}
