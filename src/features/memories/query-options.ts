export function shouldEnableStoriesQuery(enabled?: boolean): boolean {
  return enabled ?? true;
}

const TITLE_POLL_MS = 4_000;
const TITLE_POLL_WINDOW_MS = 3 * 60_000;

type TitlePending = { enrichment_status?: string; capture_source?: string; updated_at?: string; created_at?: string };

/** True while a story saved without a title is still waiting for its generated one. */
export function isAwaitingGeneratedTitle(memory: TitlePending | null | undefined, now = Date.now()): boolean {
  if (memory?.enrichment_status !== 'pending' || memory.capture_source !== 'quick') return false;
  const savedAt = Date.parse(memory.updated_at || memory.created_at || '');
  // Stop polling a job that never finished instead of refetching forever.
  return Number.isFinite(savedAt) && now - savedAt < TITLE_POLL_WINDOW_MS;
}

/** Refetch interval that picks up generated titles shortly after an untitled save. */
export function generatedTitlePollInterval(memories: readonly (TitlePending | null | undefined)[], now = Date.now()): number | false {
  return memories.some((memory) => isAwaitingGeneratedTitle(memory, now)) ? TITLE_POLL_MS : false;
}
