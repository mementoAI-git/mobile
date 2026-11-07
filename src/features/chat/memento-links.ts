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

/** An action Memento is waiting for the host to confirm, shown as buttons. */
export type ChatConfirmation = {
  tool: string;
  memory: string;
  args: Record<string, unknown>;
  text: string;
  /** Already confirmed: shown as done. */
  confirmed: boolean;
};

const CARD = /\n*```memento-(confirm|confirmed)\n([^\n]*)\n```/g;
const UNFINISHED_CARD = /\n*```memento-confirm[\s\S]*$/;

/** Takes Memento's confirmation cards out of a reply, leaving its words. */
export function splitConfirmations(text = ''): { text: string; cards: ChatConfirmation[] } {
  const cards: ChatConfirmation[] = [];
  const rest = text.replace(CARD, (_, kind: string, json: string) => {
    try {
      const card = JSON.parse(json) as Partial<ChatConfirmation>;
      if (typeof card.tool === 'string' && typeof card.memory === 'string' && card.args && typeof card.text === 'string') {
        cards.push({ tool: card.tool, memory: card.memory, args: card.args, text: card.text, confirmed: kind === 'confirmed' });
      }
    } catch {
      // Not a card Memento wrote; drop it rather than show raw JSON.
    }
    return '';
  });
  // While the reply is still streaming, a card may be half there.
  return { text: rest.replace(UNFINISHED_CARD, '').trimEnd(), cards };
}
