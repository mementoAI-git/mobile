export type StoryHtmlBlock =
  | { type: 'paragraph' | 'blockquote' | 'h1' | 'h2'; html: string }
  | { type: 'ul' | 'ol'; items: string[] };

type StoryHtmlTextBlockType = Extract<StoryHtmlBlock['type'], 'paragraph' | 'blockquote' | 'h1' | 'h2'>;

const BLOCK_REGEX = /<(blockquote|p|h1|h2|ul|ol)>([\s\S]*?)<\/\1>/gi;
const LIST_ITEM_REGEX = /<li>([\s\S]*?)<\/li>/gi;

export function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

export function stripOuterParagraphTags(html: string) {
  return html.replace(/^\s*<p>/i, '').replace(/<\/p>\s*$/i, '');
}

export function hasMeaningfulInlineHtmlContent(html?: string | null) {
  if (!html) return false;

  const normalized = decodeHtmlEntities(
    html
      .replace(/<br\s*\/?>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim(),
  ).trim();

  return normalized.length > 0;
}

export function parseStoryHtmlBlocks(rawHtml?: string | null): StoryHtmlBlock[] {
  if (!rawHtml?.trim()) return [];

  const blocks: StoryHtmlBlock[] = [];
  const html = rawHtml.trim();
  let matchedAny = false;

  for (const match of html.matchAll(BLOCK_REGEX)) {
    matchedAny = true;
    const tag = (match[1] ?? '').toLowerCase();
    const inner = (match[2] ?? '').trim();

    if (tag === 'ul' || tag === 'ol') {
      const items = Array.from(inner.matchAll(LIST_ITEM_REGEX))
        .map((itemMatch) => stripOuterParagraphTags((itemMatch[1] ?? '').trim()))
        .filter((item) => hasMeaningfulInlineHtmlContent(item));

      if (items.length) blocks.push({ type: tag, items });
      continue;
    }

    const normalizedInner = tag === 'blockquote'
      ? stripOuterParagraphTags(inner).trim()
      : inner;

    if (hasMeaningfulInlineHtmlContent(normalizedInner)) {
      const normalizedType: StoryHtmlTextBlockType = tag === 'p'
        ? 'paragraph'
        : tag as StoryHtmlTextBlockType;

      blocks.push({ type: normalizedType, html: normalizedInner });
    }
  }

  if (!matchedAny && hasMeaningfulInlineHtmlContent(html)) {
    return [{ type: 'paragraph', html }];
  }

  return blocks;
}