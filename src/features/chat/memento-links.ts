/**
 * Memento links in chat replies. The API only lets a reply keep links to the
 * host's own stories and conversations it was given (as /stories/:id and
 * /chat/:id), so the app can open them in place.
 */

const IN_APP = /^\/(stories|chat)\/([0-9a-fA-F]{24})\/?$/;

export type MementoLink = { kind: 'story' | 'conversation'; id: string };

export function parseMementoPath(url: string): MementoLink | null {
  const match = url.match(IN_APP);
  if (!match) return null;
  return { kind: match[1] === 'stories' ? 'story' : 'conversation', id: match[2] };
}

/** Where the app opens a story or conversation. */
export function mementoRoute(link: MementoLink) {
  return link.kind === 'story'
    ? ({ pathname: '/(tabs)/stories/[id]', params: { id: link.id } } as const)
    : ({ pathname: '/chat/[id]', params: { id: link.id } } as const);
}

/** The stories and conversations a reply links to, in order, once each. */
export function collectReplySources(text = ''): (MementoLink & { label: string })[] {
  const seen = new Set<string>();
  const sources: (MementoLink & { label: string })[] = [];
  for (const [, label, url] of text.matchAll(/\[([^\]\n]+)\]\(([^)\s]+)\)/g)) {
    const link = parseMementoPath(url);
    if (!link || seen.has(link.id)) continue;
    seen.add(link.id);
    sources.push({ ...link, label: label.trim() });
  }
  return sources;
}
