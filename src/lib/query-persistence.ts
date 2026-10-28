/** Unused query data is released from memory after this long. */
export const QUERY_GC_TIME_MS = 10 * 60_000;

/** Saved query data older than this is discarded on launch. */
export const PERSIST_MAX_AGE_MS = 7 * 24 * 60 * 60_000;

/**
 * Small queries saved to storage so the app opens instantly, even offline.
 * Everything else, such as chat messages and paged story lists, is fetched
 * again on demand, so it never piles up in memory or in the saved cache.
 */
const PERSISTED_ROOTS: ReadonlySet<string> = new Set([
  'profile',
  'user-stats',
  'persona',
  'subscription',
  'daily-prompts',
  'overview-prompts',
  'explore-categories',
  'beneficiaries',
]);

/** The Overview screen's first page of memories. */
export const PERSISTED_MEMORIES_KEY = ['memories', { limit: 50 }] as const;

function isOverviewMemories(queryKey: readonly unknown[]): boolean {
  if (queryKey[0] !== 'memories' || queryKey.length !== 2) return false;
  const params = queryKey[1] as Record<string, unknown> | undefined;
  return !!params && Object.keys(params).length === 1 && params.limit === 50;
}

export function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  const root = queryKey[0];
  if (typeof root !== 'string') return false;
  return PERSISTED_ROOTS.has(root) || isOverviewMemories(queryKey);
}

/** Query key prefixes that keep their data as long as the saved cache does. */
export function persistedQueryPrefixes(): ReadonlyArray<readonly unknown[]> {
  return [...[...PERSISTED_ROOTS].map((root) => [root] as const), PERSISTED_MEMORIES_KEY];
}
