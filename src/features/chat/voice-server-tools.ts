import { withDeadline } from './voice-connection';
import { resolveVoiceDestination, type VoiceDestination } from './voice-call-actions';
import type { VoiceToolHandler, VoiceToolInvocation } from './voice-tool-relay';

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

/**
 * A timeout does not mean the server did nothing: the change may still land.
 * Asking again would make a second request, so the model must not retry.
 */
export const SERVER_TOOL_UNCERTAIN =
  'That is taking longer than usual and may still go through. Do not call it again. Tell the host it might take a moment and that they can check in the app.';

const TOOL_TIMEOUT = 'Voice tool timed out.';

/** Our deadline, or the HTTP client's own timeout. */
function isTimeout(error: unknown): boolean {
  const { code, message } = (error ?? {}) as { code?: unknown; message?: unknown };
  return (
    message === TOOL_TIMEOUT ||
    code === 'ECONNABORTED' ||
    code === 'ETIMEDOUT' ||
    (typeof message === 'string' && /timeout/i.test(message))
  );
}

/** A call with no invocation context is the live one. */
const LIVE: VoiceToolInvocation = { isLive: () => true };

/** Effects that move the host somewhere: only for the call that asked. */
function navigates(effect: VoiceToolEffect): boolean {
  return effect.type === 'open' || effect.type === 'open_story';
}

const REFRESHABLE = ['profile', 'memories', 'capsules', 'beneficiaries'] as const;
export type VoiceRefreshable = (typeof REFRESHABLE)[number];

export type VoiceToolEffect =
  | { type: 'refresh'; what: VoiceRefreshable }
  | { type: 'open'; destination: VoiceDestination }
  | { type: 'open_story'; id: string };

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

export function parseVoiceToolEffects(raw: unknown): VoiceToolEffect[] {
  if (!Array.isArray(raw)) return [];
  const effects: VoiceToolEffect[] = [];
  for (const item of raw) {
    const effect = item as Record<string, unknown> | null;
    if (!effect || typeof effect !== 'object') continue;
    if (effect.type === 'refresh' && REFRESHABLE.includes(effect.what as VoiceRefreshable)) {
      effects.push({ type: 'refresh', what: effect.what as VoiceRefreshable });
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
    run: (
      name: string,
      args: Record<string, unknown>,
      invocation: VoiceToolInvocation,
    ) => Promise<unknown>;
    applyEffects: (effects: VoiceToolEffect[]) => void;
    timeoutMs?: number;
  },
): Record<string, VoiceToolHandler> {
  const handlers: Record<string, VoiceToolHandler> = {};
  for (const name of names) {
    handlers[name] = async (args, invocation = LIVE) => {
      try {
        const response = (await withDeadline(
          deps.run(name, args, invocation),
          deps.timeoutMs ?? VOICE_SERVER_TOOL_TIMEOUT_MS,
          TOOL_TIMEOUT,
        )) as { data?: { result?: unknown; effects?: unknown } } | undefined;
        const result = response?.data?.result;
        if (typeof result !== 'string' || !result.trim()) return SERVER_TOOL_UNAVAILABLE;
        // The change is made either way, so cached screens refresh; but a
        // call that ended (or a newer one) must not be moved somewhere.
        const effects = parseVoiceToolEffects(response?.data?.effects);
        const live = invocation.isLive();
        deps.applyEffects(live ? effects : effects.filter((effect) => !navigates(effect)));
        return result;
      } catch (error) {
        return isTimeout(error) ? SERVER_TOOL_UNCERTAIN : SERVER_TOOL_UNAVAILABLE;
      }
    };
  }
  return handlers;
}
