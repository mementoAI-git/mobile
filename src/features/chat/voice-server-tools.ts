import { withDeadline } from './voice-connection';
import { resolveVoiceDestination, type VoiceDestination } from './voice-call-actions';
import type { VoiceToolHandler } from './voice-tool-relay';

/**
 * Tools Memento runs on the server (profile changes, opening a story, and
 * whatever the API adds later). The token lists them in `serverTools`; each
 * call is forwarded to POST /ai/voice/tools/:name with the host's session.
 * The server returns the text Gemini hears and effects for the app to apply.
 *
 * Only effect types this build knows are applied, so the server can add new
 * tools without an app release as long as they use existing effect types.
 */

/** Token capability: this build forwards server tools and applies their effects. */
export const SERVER_TOOLS_CAPABILITY = 'server_tools';

/** Longest Memento waits on a server action before saying it did not work. */
export const VOICE_SERVER_TOOL_TIMEOUT_MS = 8_000;

export const SERVER_TOOL_UNAVAILABLE =
  'That did not go through. Tell the host it did not work and that they can try again or do it in the app.';

export type VoiceToolEffect =
  | { type: 'refresh'; what: 'profile' }
  | { type: 'open'; destination: VoiceDestination }
  | { type: 'open_story'; id: string };

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

export function parseVoiceToolEffects(raw: unknown): VoiceToolEffect[] {
  if (!Array.isArray(raw)) return [];
  const effects: VoiceToolEffect[] = [];
  for (const item of raw) {
    const effect = item as Record<string, unknown> | null;
    if (!effect || typeof effect !== 'object') continue;
    if (effect.type === 'refresh' && effect.what === 'profile') {
      effects.push({ type: 'refresh', what: 'profile' });
    } else if (effect.type === 'open' && resolveVoiceDestination(effect.destination)) {
      effects.push({ type: 'open', destination: effect.destination as VoiceDestination });
    } else if (
      effect.type === 'open_story' &&
      typeof effect.id === 'string' &&
      OBJECT_ID.test(effect.id)
    ) {
      effects.push({ type: 'open_story', id: effect.id });
    }
  }
  return effects;
}

export function createServerToolHandlers(
  names: readonly string[],
  deps: {
    run: (name: string, args: Record<string, unknown>) => Promise<unknown>;
    applyEffects: (effects: VoiceToolEffect[]) => void;
    timeoutMs?: number;
  },
): Record<string, VoiceToolHandler> {
  const handlers: Record<string, VoiceToolHandler> = {};
  for (const name of names) {
    handlers[name] = async (args) => {
      try {
        const response = (await withDeadline(
          deps.run(name, args),
          deps.timeoutMs ?? VOICE_SERVER_TOOL_TIMEOUT_MS,
          `${name} timed out.`,
        )) as { data?: { result?: unknown; effects?: unknown } } | undefined;
        const result = response?.data?.result;
        if (typeof result !== 'string' || !result.trim()) return SERVER_TOOL_UNAVAILABLE;
        deps.applyEffects(parseVoiceToolEffects(response?.data?.effects));
        return result;
      } catch {
        return SERVER_TOOL_UNAVAILABLE;
      }
    };
  }
  return handlers;
}
