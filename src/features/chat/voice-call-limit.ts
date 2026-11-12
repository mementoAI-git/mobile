/**
 * The optional time limit on a voice call. The API sets it (VOICE_MAX_CALL_MINUTES)
 * and sends it with each token: a signed ticket for when the call started, and
 * how many seconds are left. The app gives a spoken heads-up shortly before
 * the end, then asks Memento to say goodbye; the call ends after the goodbye.
 */
export type VoiceCallTime = {
  /** Sent back with every reconnect so the server keeps counting from the start. */
  ticket: string;
  /** Seconds left when the token was issued. */
  secondsLeft: number;
};

/** How long before the end Memento mentions that time is nearly up. */
export const CALL_LIMIT_WARNING_MS = 2 * 60_000;

/** Asked of Memento when about two minutes remain. */
export const CALL_ENDING_SOON_PROMPT =
  'About two minutes are left in this call. When there is a natural pause, let them know gently, in one short sentence, and offer to pick up again in a new call. Then carry on.';

/** Asked of Memento when the time is up. */
export const CALL_TIME_UP_PROMPT =
  'The time for this call is up. Say a short, warm goodbye in one sentence now, and say they can start a new call any time.';

export function parseVoiceCallTime(response: Record<string, unknown>): VoiceCallTime | undefined {
  const ticket = response.call_ticket;
  const secondsLeft = response.call_seconds_left;
  if (typeof ticket !== 'string' || !ticket || typeof secondsLeft !== 'number' || !(secondsLeft > 0)) {
    return undefined;
  }
  return { ticket, secondsLeft };
}

/** When, from now, to give the heads-up (if there is time for one) and to end. */
export function callLimitSchedule(secondsLeft: number): { warnInMs: number | null; endInMs: number } {
  const endInMs = Math.max(0, Math.round(secondsLeft * 1000));
  const warnInMs = endInMs - CALL_LIMIT_WARNING_MS;
  return { warnInMs: warnInMs > 0 ? warnInMs : null, endInMs };
}

/** The server refused to reconnect because the call's time is up. */
export function isCallTimeUp(error: unknown): boolean {
  const failure = error as { httpStatus?: number; status?: number; details?: { reason?: string }; data?: { reason?: string } } | null;
  const reason = failure?.details?.reason ?? failure?.data?.reason;
  return (failure?.httpStatus ?? failure?.status) === 403 && reason === 'voice_call_limit';
}
