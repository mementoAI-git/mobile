/** The file name the app gives a voice call recording when it uploads it (call-recording-store.ts). */
const CALL_RECORDING_NAME = /^voice_call_/i;

/**
 * A story saved from a voice call: its audio is the call recording, and its
 * body is the transcript. Story cards show it as an audio card, like a
 * recording, rather than as transcript text.
 */
export function isCallRecordingAttachment(attachment: { name?: string | null } | null | undefined) {
  return CALL_RECORDING_NAME.test(attachment?.name ?? '');
}
