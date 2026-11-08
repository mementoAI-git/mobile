import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUiStore } from '@/store/ui.store';

/** Long enough for the editor modal to finish closing, so the root sheet host is back. */
export const FIRST_STORY_SHEET_DELAY_MS = 650;

const celebratedKey = (email?: string | null) => `memento.first-story-celebrated.${email ?? 'anonymous'}`;

/** A story is the first when the person had no stories before publishing it. */
export function isFirstStory(storiesCountBeforePublish: unknown): boolean {
  return storiesCountBeforePublish != null && Number(storiesCountBeforePublish) === 0;
}

/**
 * Opens the first-story celebration once per account, after `delayMs`
 * (the publish success page or the create sheet closing first).
 */
export async function celebrateFirstStory({
  memoryId,
  title,
  email,
  delayMs = FIRST_STORY_SHEET_DELAY_MS,
}: {
  memoryId: string;
  title?: string;
  email?: string | null;
  delayMs?: number;
}) {
  const key = celebratedKey(email);
  try {
    if (await AsyncStorage.getItem(key)) return;
    await AsyncStorage.setItem(key, new Date().toISOString());
  } catch {
    // Storage unavailable: still celebrate; the story count guards repeats.
  }
  setTimeout(() => {
    useUiStore.getState().openSheet('first-story-milestone', { memoryId, title });
  }, delayMs);
}
