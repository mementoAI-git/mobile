export function hasMeaningfulStoryBodyContent(html?: string | null) {
  if (!html) return false;

  const normalized = html
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<\/p>\s*<p>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();

  return normalized.length > 0;
}
