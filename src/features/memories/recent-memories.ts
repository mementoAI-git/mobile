import AsyncStorage from '@react-native-async-storage/async-storage';

/** The last few memories the host opened, for search's "Recently opened" (web `addToRecentMemories`). */
export type RecentMemory = {
  _id: string;
  title?: string;
  type?: string;
  attachments?: unknown;
  body?: string;
  opened_at: string;
  created_at?: string;
};

const MAX_RECENT = 5;

export function recentMemoriesKey(email?: string | null) {
  return `memento-recent-memories:${email ?? 'anon'}`;
}

export function parseRecentMemories(raw: string | null | undefined): RecentMemory[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((m) => m && typeof m._id === 'string') : [];
  } catch {
    return [];
  }
}

/** Puts a memory at the front of the list, keeping five, newest first. */
export function withRecentMemory(
  current: RecentMemory[],
  memory: { _id?: string; title?: string; type?: string; attachments?: unknown; body?: string; created_at?: string },
  now = new Date(),
): RecentMemory[] {
  if (!memory._id) return current;
  const entry: RecentMemory = {
    _id: memory._id,
    title: memory.title,
    type: memory.type,
    attachments: memory.attachments,
    body: memory.body?.substring(0, 150),
    opened_at: now.toISOString(),
    created_at: memory.created_at,
  };
  return [entry, ...current.filter((m) => m._id !== memory._id)].slice(0, MAX_RECENT);
}

export async function getRecentMemories(email?: string | null): Promise<RecentMemory[]> {
  try {
    return parseRecentMemories(await AsyncStorage.getItem(recentMemoriesKey(email)));
  } catch {
    return [];
  }
}

export async function addToRecentMemories(
  memory: Parameters<typeof withRecentMemory>[1],
  email?: string | null,
) {
  try {
    const next = withRecentMemory(await getRecentMemories(email), memory);
    await AsyncStorage.setItem(recentMemoriesKey(email), JSON.stringify(next));
  } catch {
    // Not critical: search still works without the recent list.
  }
}
