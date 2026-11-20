import { post } from '@/api/mutations';
import { deviceTimeZone } from './voice-token-url';

/** How often a live call checks in, so a call that closes abruptly loses at most this much. */
export const VOICE_USAGE_CHECK_IN_MS = 60_000;

export const VOICE_USAGE_PATH = '/ai/voice/usage';

/** Silence up to this long counts as part of the conversation; only what follows is free. */
export const VOICE_QUIET_GRACE_MS = 60_000;

/**
 * Measures a call's long silences (web: src/features/voice/usage.ts): the
 * stretches with no speech from either side, less the first minute of each,
 * so a call left open isn't charged for the quiet. Only ever grows.
 */
export class VoiceQuietClock {
  private lastActivity: number;
  private banked = 0;

  constructor(startedAt: number = Date.now()) {
    this.lastActivity = startedAt;
  }

  /** Someone spoke (the member or Memento). */
  activity(at: number = Date.now()): void {
    if (at <= this.lastActivity) return;
    this.banked += Math.max(0, at - this.lastActivity - VOICE_QUIET_GRACE_MS);
    this.lastActivity = at;
  }

  /** Seconds of long silence so far, including a silence still going on. */
  quietSeconds(at: number = Date.now()): number {
    const current = Math.max(0, at - this.lastActivity - VOICE_QUIET_GRACE_MS);
    return Math.floor((this.banked + current) / 1000);
  }
}

/**
 * Tells the API the call is connected. The API counts the call from its first
 * connected check-in (not from when the token was fetched ahead of the tap),
 * on its own clock, less the long silences reported here, so voice minutes add
 * up across calls even when one ends without a goodbye. Failures are ignored:
 * the next check-in, a reconnect or the end report records the time instead.
 */
export function sendVoiceUsageCheckIn(callTicket: string, quietSeconds = 0): Promise<void> {
  const timezone = deviceTimeZone();
  return post(VOICE_USAGE_PATH, {
    call_ticket: callTicket,
    connected: true,
    quiet_seconds: Math.max(0, Math.floor(quietSeconds)),
    ...(timezone ? { timezone } : {}),
  })
    .then(() => undefined)
    .catch(() => undefined);
}

export interface VoiceUsage {
  /** The member's current month, YYYY-MM. */
  month: string;
  monthSeconds: number;
  allTimeSeconds: number;
  /** When "this month" starts over (midnight on the 1st, local time). */
  monthResetsAt: Date | null;
  /** Free plan only: the monthly allowance and what is left. Null on paid plans. */
  freeLimitSeconds: number | null;
  freeLeftSeconds: number | null;
}

const seconds = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : null);

/** Reads `data` of GET /ai/voice/usage. */
export function parseVoiceUsage(data: unknown): VoiceUsage | null {
  if (!data || typeof data !== 'object') return null;
  const value = data as Record<string, unknown>;
  const monthSeconds = seconds(value.month_seconds);
  const allTimeSeconds = seconds(value.all_time_seconds);
  if (monthSeconds === null || allTimeSeconds === null) return null;
  const resets = typeof value.month_resets_at === 'string' ? new Date(value.month_resets_at) : null;
  return {
    month: typeof value.month === 'string' ? value.month : '',
    monthSeconds,
    allTimeSeconds,
    monthResetsAt: resets && !Number.isNaN(resets.getTime()) ? resets : null,
    freeLimitSeconds: seconds(value.free_seconds_limit),
    freeLeftSeconds: seconds(value.free_seconds_left),
  };
}

/** Whole minutes, rounded down so the count never runs ahead of the allowance. */
export function voiceMinutes(totalSeconds: number): number {
  return Math.floor(Math.max(0, totalSeconds) / 60);
}

/** "45 min", or "3 h 5 min" from an hour up. */
export function formatVoiceMinutes(totalSeconds: number): string {
  const minutes = voiceMinutes(totalSeconds);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}
