import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

type SafeBackRouter<Fallback> = {
  canGoBack: () => boolean;
  back: () => void;
  replace: (href: Fallback) => void;
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safe back navigation — guards against GO_BACK errors when the screen
 * is the root of the navigation stack (e.g. opened via deep link, push
 * notification, or router.replace() which clears back history).
 *
 * Usage:
 *   safeBack(router, '/(tabs)/overview');
 */
export function safeBack<Fallback>(router: SafeBackRouter<Fallback>, fallback: Fallback) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}

export function formatBytes(bytes: number | string): string {
  const n = typeof bytes === 'string' ? parseFloat(bytes) : bytes;
  if (n === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(n) / Math.log(k));
  return `${parseFloat((n / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

export function resolveParam(template: string, param: string): string {
  return template.replace(':id', param);
}

export function inferMimeType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    heic: 'image/heic',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    mp3: 'audio/mpeg',
    m4a: 'audio/m4a',
    wav: 'audio/wav',
    pdf: 'application/pdf',
  };
  return map[ext] ?? 'application/octet-stream';
}

export type ChatReplyQuote = {
  role: string;
  text: string;
};

export function snippetReplyText(text: string, max = 220): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function buildPromptWithReplyQuote(
  userText: string,
  replyTo: ChatReplyQuote | null | undefined,
  maxQuotedLength = 4000
): string {
  const body = userText.trim();
  if (!replyTo?.text?.trim()) return body;

  const label =
    replyTo.role === 'user' ? "the user's earlier message" : "Memento's earlier reply";
  let quoted = replyTo.text.trim();
  if (quoted.length > maxQuotedLength) {
    quoted = `${quoted.slice(0, maxQuotedLength).trimEnd()}…`;
  }

  return (
    `[The user is replying to ${label}:\n` +
    `---\n${quoted}\n---]\n\n` +
    body
  );
}
