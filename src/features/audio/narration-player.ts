export interface NarrationTrack {
  id: string;
  title: string;
  author?: string;
  audioUrl?: string;
  duration?: number;
  text?: string;
}

export const PLAYBACK_SPEEDS = [1.0, 1.25, 1.5] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

export function getNextPlaybackSpeed(current: PlaybackSpeed): PlaybackSpeed {
  const index = PLAYBACK_SPEEDS.indexOf(current);
  if (index === -1 || index === PLAYBACK_SPEEDS.length - 1) {
    return PLAYBACK_SPEEDS[0];
  }
  return PLAYBACK_SPEEDS[index + 1];
}

export function formatNarrationTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function calculateNarrationProgress(currentTime: number, duration: number): number {
  if (!duration || duration <= 0) return 0;
  const clampedCurrent = Math.max(0, Math.min(currentTime, duration));
  return Math.min(100, Math.max(0, (clampedCurrent / duration) * 100));
}
