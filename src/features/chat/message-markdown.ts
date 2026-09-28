export type MessageMarkdownToken =
  | { type: 'text'; text: string }
  | { type: 'italic'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'bold_italic'; text: string }
  | { type: 'code'; text: string }
  | { type: 'strikethrough'; text: string }
  | { type: 'highlight'; text: string }
  | { type: 'link'; label: string; url: string }
  | { type: 'url'; url: string };

const INLINE_MARKDOWN_RE =
  /(\[.+?\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s]+|\*\*\*[^\s*](?:[\s\S]*?[^\s*])?\*\*\*|\*\*[^\s*](?:[\s\S]*?[^\s*])?\*\*|\*[^\s*](?:[\s\S]*?[^\s*])?\*|___[^\s_](?:[\s\S]*?[^\s_])?___|__[^\s_](?:[\s\S]*?[^\s_])?__|`[^`\n]+`|~~[^\s~](?:[\s\S]*?[^\s~])?~~|==[^\s=](?:[\s\S]*?[^\s=])?==|(?:^|[\s(])_[^\s_](?:[\s\S]*?[^\s_])?_(?=[\s.,!?;:)]|$))/g;

/**
 * Tokenizes plain text with inline Markdown formatting and links
 * into structured tokens for rich rendering in chat bubbles.
 */
export function tokenizeMessageMarkdown(text: string): MessageMarkdownToken[] {
  if (!text) return [];

  const tokens: MessageMarkdownToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  INLINE_MARKDOWN_RE.lastIndex = 0;

  while ((match = INLINE_MARKDOWN_RE.exec(text)) !== null) {
    let matchStr = match[0];
    let matchStart = match.index;

    // Handle leading whitespace or open parenthesis captured for underscore word boundaries
    if (matchStr.startsWith(' ') || matchStr.startsWith('\t') || matchStr.startsWith('(')) {
      matchStr = matchStr.slice(1);
      matchStart += 1;
    }

    if (matchStart > lastIndex) {
      tokens.push({ type: 'text', text: text.slice(lastIndex, matchStart) });
    }

    if (matchStr.startsWith('[') && matchStr.includes('](')) {
      const closingBracket = matchStr.indexOf('](');
      const label = matchStr.slice(1, closingBracket);
      const url = matchStr.slice(closingBracket + 2, -1);
      tokens.push({ type: 'link', label, url });
    } else if (matchStr.startsWith('http://') || matchStr.startsWith('https://')) {
      const punctMatch = matchStr.match(/[.,!?;:)]+$/);
      let punct = '';
      let url = matchStr;
      if (punctMatch) {
        punct = punctMatch[0];
        url = url.slice(0, -punct.length);
      }
      tokens.push({ type: 'url', url });
      if (punct) {
        tokens.push({ type: 'text', text: punct });
      }
    } else if (matchStr.startsWith('***') && matchStr.endsWith('***')) {
      tokens.push({ type: 'bold_italic', text: matchStr.slice(3, -3) });
    } else if (matchStr.startsWith('___') && matchStr.endsWith('___')) {
      tokens.push({ type: 'bold_italic', text: matchStr.slice(3, -3) });
    } else if (matchStr.startsWith('**') && matchStr.endsWith('**')) {
      tokens.push({ type: 'bold', text: matchStr.slice(2, -2) });
    } else if (matchStr.startsWith('__') && matchStr.endsWith('__')) {
      tokens.push({ type: 'bold', text: matchStr.slice(2, -2) });
    } else if (matchStr.startsWith('*') && matchStr.endsWith('*')) {
      tokens.push({ type: 'italic', text: matchStr.slice(1, -1) });
    } else if (matchStr.startsWith('_') && matchStr.endsWith('_')) {
      tokens.push({ type: 'italic', text: matchStr.slice(1, -1) });
    } else if (matchStr.startsWith('`') && matchStr.endsWith('`')) {
      tokens.push({ type: 'code', text: matchStr.slice(1, -1) });
    } else if (matchStr.startsWith('~~') && matchStr.endsWith('~~')) {
      tokens.push({ type: 'strikethrough', text: matchStr.slice(2, -2) });
    } else if (matchStr.startsWith('==') && matchStr.endsWith('==')) {
      tokens.push({ type: 'highlight', text: matchStr.slice(2, -2) });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', text: text.slice(lastIndex) });
  }

  return tokens;
}
