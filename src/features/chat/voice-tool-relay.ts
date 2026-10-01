export const SEARCH_MEMORIES_TOOL = 'search_memories';

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

  constructor(
    private readonly searchMemories: (query: string) => Promise<string>,
    private readonly send: (responses: VoiceToolResponse[]) => void,
    private readonly handlers: Record<string, VoiceToolHandler> = {},
  ) {}

  async handle(calls: VoiceToolCall[]): Promise<void> {
    const responses = await Promise.all(calls.map((call) => this.respond(call)));
    const live = responses.filter((response) => !response.id || !this.cancelled.has(response.id));
    if (live.length) this.send(live);
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
      const result = await this.searchMemories(query.slice(0, 200));
      return reply(result.trim() || MEMORY_SEARCH_UNAVAILABLE);
    } catch {
      return reply(MEMORY_SEARCH_UNAVAILABLE);
    }
  }
}
