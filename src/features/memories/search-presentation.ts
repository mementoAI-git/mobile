/** Pure helpers for the search sheet, mirroring web `search-item.tsx` and `search-modal-v2.tsx`. */

export type SearchPicture = { _id?: string; url: string; thumbnail?: string | null; type?: string; name?: string; access?: never };

const IMAGE_EXTENSION = /\.(png|jpe?g|gif|webp|heic|heif|avif)(\?|#|$)/i;

/** The first picture on a memory, for its row. */
export function searchPictureOf(attachments: unknown): SearchPicture | null {
  if (!Array.isArray(attachments)) return null;
  for (const file of attachments as SearchPicture[]) {
    if (!file || typeof file !== 'object' || !file.url) continue;
    if (file.thumbnail || file.type?.startsWith('image') || IMAGE_EXTENSION.test(file.name || '') || IMAGE_EXTENSION.test(file.url)) {
      return file;
    }
  }
  return null;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Splits text so each search word can be marked, longest words first. */
export function searchHighlightParts(text: string, term: string): { text: string; match: boolean }[] {
  const keywords = term.trim().split(/\s+/).filter(Boolean).sort((a, b) => b.length - a.length);
  if (!text || !keywords.length) return [{ text, match: false }];
  const pattern = new RegExp(`(${keywords.map(escapeRegExp).join('|')})`, 'gi');
  return text
    .split(pattern)
    .filter((part) => part.length > 0)
    .map((part) => ({ text: part, match: keywords.some((k) => k.toLowerCase() === part.toLowerCase()) }));
}

/** The status line under the search field, word for word with web. */
export function searchStatusText({
  isSearching,
  failed,
  search,
}: {
  isSearching: boolean;
  failed: boolean;
  search?: { mode?: string; preparing?: boolean; limited?: boolean };
}): string | null {
  if (isSearching) return 'Searching your memories…';
  if (failed) return null;
  if (search?.preparing) return 'Some memories are still being prepared. Word searches still work.';
  if (search?.limited) return 'Some memories can only be searched by their words right now.';
  if (search?.mode === 'keyword') return 'Searching words in your memories.';
  return 'Searches your saved memories, stories and chats.';
}
