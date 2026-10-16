import { withDeadline } from './voice-connection';

export const SEARCH_MEMORIES_TOOL = 'search_memories';

/** Longest Memento waits on a memory search before carrying on without it. */
export const VOICE_MEMORY_SEARCH_TIMEOUT_MS = 6_000;

export const MEMORY_SEARCH_UNAVAILABLE =
  'Memory search is unavailable right now. Continue the conversation without it.';

export type VoiceToolCall = {
  id?: string;
  name: string;
  args: Record<string, unknown>;
};

/** Handles one tool call and returns the text the model receives. */
export type VoiceToolHandler = (args: Record<string, unknown>) => Promise<string> | string;

export type VoiceToolResponse = {
  id?: string;
  name: string;
  response: { result: string };
};

/**
 * Answers Gemini Live function calls from the phone. The model waits for a
 * response, so every call gets one, even on failure, unless Gemini cancels it.
 */
export class VoiceToolRelay {
  private readonly cancelled = new Set<string>();
  private disposed = false;

  constructor(
    private readonly searchMemories: (query: string) => Promise<string>,
    private readonly send: (responses: VoiceToolResponse[]) => void,
    private readonly handlers: Record<string, VoiceToolHandler> = {},
    private readonly options: { searchTimeoutMs?: number } = {},
  ) {}

  /**
   * Answers each call as soon as its result is ready. gemini-3.8-live runs
   * tools asynchronously by default, so a finished result need not wait for
   * an unrelated slow one in the same batch.
   */
  async handle(calls: VoiceToolCall[]): Promise<void> {
    await Promise.all(
      calls.map(async (call) => {
        const response = await this.respond(call);
        // The call ended while the tool ran: never send into a later call.
        if (this.disposed) return;
        if (response.id && this.cancelled.has(response.id)) return;
        this.send([response]);
      }),
    );
  }

  /** The call ended. Results that finish later are dropped. */
  dispose(): void {
    this.disposed = true;
  }

  cancel(ids: string[]): void {
    for (const id of ids) this.cancelled.add(id);
  }

  private async respond(call: VoiceToolCall): Promise<VoiceToolResponse> {
    const reply = (result: string): VoiceToolResponse => ({
      id: call.id,
      name: call.name,
      response: { result },
    });
    if (Object.prototype.hasOwnProperty.call(this.handlers, call.name)) {
      try {
        return reply(await this.handlers[call.name](call.args ?? {}));
      } catch {
        return reply(`${call.name} failed. Tell the host it did not work.`);
      }
    }
    if (call.name !== SEARCH_MEMORIES_TOOL) return reply(`Unknown tool ${call.name}.`);
    const query = typeof call.args?.query === 'string' ? call.args.query.trim() : '';
    if (!query) return reply('No search query was given.');
    try {
      // The model waits for this answer, so bound it: a slow search must not
      // leave the call silent.
      const result = await withDeadline(
        this.searchMemories(query.slice(0, 200)),
        this.options.searchTimeoutMs ?? VOICE_MEMORY_SEARCH_TIMEOUT_MS,
        'Memory search timed out.',
      );
      return reply(result.trim() || MEMORY_SEARCH_UNAVAILABLE);
    } catch {
      return reply(MEMORY_SEARCH_UNAVAILABLE);
    }
  }
}
