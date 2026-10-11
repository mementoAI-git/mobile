/**
 * Deadlines and transport ownership for a Gemini Live voice call.
 */

/** Longest wait for Gemini's setupComplete after the socket opens. */
export const VOICE_SETUP_TIMEOUT_MS = 10_000;
/** Longest wait for the API to issue a session token. */
export const VOICE_TOKEN_TIMEOUT_MS = 15_000;
/** Longest a reconnect may take overall, across all attempts. */
export const VOICE_RECONNECT_BUDGET_MS = 20_000;
export const VOICE_RECONNECT_DELAYS_MS = [0, 500, 1_500, 3_000, 5_000];

/** Rejects with `message` if `promise` has not settled within `ms`. */
export function withDeadline<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}

/**
 * Delay before reconnect attempt `attempt`, or null to give up. Each attempt
 * can spend a token request and a setup wait, so the schedule alone does not
 * bound recovery; the time already spent does.
 */
export function nextReconnectDelay(attempt: number, elapsedMs: number): number | null {
  if (attempt >= VOICE_RECONNECT_DELAYS_MS.length) return null;
  const delay = VOICE_RECONNECT_DELAYS_MS[attempt];
  return elapsedMs + delay >= VOICE_RECONNECT_BUDGET_MS ? null : delay;
}

/**
 * Which socket may deliver call events. A reconnect opens a replacement while
 * the old socket is still in use; until the swap, the replacement only
 * completes its own setup, and after it the old socket's late messages are
 * ignored.
 */
export class VoiceTransports {
  private nextId = 0;
  private activeId = 0;

  begin(): number {
    this.nextId += 1;
    return this.nextId;
  }

  activate(id: number): void {
    this.activeId = id;
  }

  isActive(id: number): boolean {
    return id !== 0 && id === this.activeId;
  }

  reset(): void {
    this.activeId = 0;
  }
}
