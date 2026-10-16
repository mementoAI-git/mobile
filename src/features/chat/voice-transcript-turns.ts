export type VoiceTranscriptMessage = {
  role: 'user' | 'ai';
  text: string;
  is_voice: true;
  duration?: number;
};

export type VoiceTranscriptTurn = {
  messages: VoiceTranscriptMessage[];
};

const NO_SPACE_BEFORE = /^[.,!?;:'"\-–—)}\]]/;
const TRANSCRIPT_BOUNDARY = /[\s.,!?;:'"\-–—(){}\[\]]/;

function normalizeTranscript(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * Gemini Live transcription delivery varies by model/version. A frame may be a
 * cumulative corrected snapshot, a small delta, or a repeated frame. Merge all
 * three forms without duplicating words or dropping corrections.
 */
export function mergeVoiceTranscript(current: string, incoming: string): string {
  return mergeTranscriptParts(current, incoming).text;
}

function leadingSharedWords(previous: string, next: string): { shared: number; total: number } {
  const a = previous.toLocaleLowerCase().split(' ');
  const b = next.toLocaleLowerCase().split(' ');
  let shared = 0;
  while (shared < a.length && shared < b.length && a[shared] === b[shared]) shared += 1;
  return { shared, total: a.length };
}

/**
 * `related` is false when `incoming` has no visible relation to `current`
 * and was simply appended: then it may be a different utterance.
 */
function mergeTranscriptParts(current: string, incoming: string): { text: string; related: boolean } {
  const previous = normalizeTranscript(current);
  const next = normalizeTranscript(incoming);
  if (!next) return { text: previous, related: true };
  if (!previous) return { text: next, related: true };
  if (next === previous) return { text: previous, related: true };
  if (next.startsWith(previous)) return { text: next, related: true };
  if (previous.startsWith(next)) return { text: previous, related: true };

  const previousLower = previous.toLocaleLowerCase();
  const nextLower = next.toLocaleLowerCase();
  const maxOverlap = Math.min(previous.length, next.length);
  for (let overlap = maxOverlap; overlap >= 2; overlap -= 1) {
    const previousBoundary =
      overlap === previous.length || TRANSCRIPT_BOUNDARY.test(previous[previous.length - overlap - 1]);
    const nextBoundary =
      overlap === next.length || TRANSCRIPT_BOUNDARY.test(next[overlap]);
    if (
      previousBoundary &&
      nextBoundary &&
      previousLower.slice(-overlap) === nextLower.slice(0, overlap)
    ) {
      return { text: `${previous}${next.slice(overlap)}`, related: true };
    }
  }

  // A corrected snapshot: it opens with most of the existing text and then
  // differs ("I went to Lagos" -> "I went to Abuja"). Keep the newer version;
  // appending would store both. A continuation never restates most of the
  // line before it.
  const { shared, total } = leadingSharedWords(previous, next);
  if (shared >= 2 && shared >= Math.ceil(total / 2)) return { text: next, related: true };

  return {
    text: NO_SPACE_BEFORE.test(next) ? `${previous}${next}` : `${previous} ${next}`,
    related: false,
  };
}

export class VoiceTranscriptTurns {
  private active = {
    userFinal: '',
    userInterim: '',
    ai: '',
  };
  private completed: VoiceTranscriptTurn[] = [];
  private sessionTurns: VoiceTranscriptTurn[] = [];
  private pending: VoiceTranscriptTurn | null = null;

  /**
   * Append a user speech fragment.
   *
   * Final and interim frames can be cumulative snapshots or deltas, so both
   * buffers use the overlap-aware merger. They remain separate so a final
   * frame can supersede interim display text without duplication.
   */
  appendUser(fragment: string, isInterim = false): string {
    if (!fragment.trim()) return this.getActiveUserText();

    if (isInterim) {
      this.active.userInterim = mergeVoiceTranscript(this.active.userInterim, fragment);
    } else {
      const pendingUser = this.pending?.messages.find((message) => message.role === 'user');
      // A late final for the turn that just ended amends it. Anything else in
      // the settle window is the user's next utterance: it starts a new turn,
      // even after a model-only turn like the greeting.
      if (pendingUser && !this.active.userInterim && !this.active.userFinal) {
        const merged = mergeTranscriptParts(pendingUser.text, fragment);
        if (merged.related) {
          pendingUser.text = merged.text;
          return pendingUser.text;
        }
      }
      this.active.userFinal = mergeVoiceTranscript(this.active.userFinal, fragment);
      this.active.userInterim = '';
    }
    return this.getActiveUserText();
  }

  getActiveUserText(): string {
    return mergeVoiceTranscript(this.active.userFinal, this.active.userInterim);
  }

  /**
   * Append a model speech transcription fragment.
   *
   * Gemini may stream output transcription as deltas, cumulative corrected
   * snapshots, or duplicates, with or without leading whitespace.
   */
  appendModel(fragment: string): string {
    const pendingModel = this.pending?.messages.find((message) => message.role === 'ai');
    if (this.pending && !this.active.ai) {
      if (pendingModel) {
        pendingModel.text = mergeVoiceTranscript(pendingModel.text, fragment);
      } else if (fragment.trim()) {
        this.pending.messages.push({ role: 'ai', text: fragment.trim(), is_voice: true });
      }
      return pendingModel?.text ?? fragment.trim();
    }
    this.active.ai = mergeVoiceTranscript(this.active.ai, fragment);
    return this.active.ai;
  }

  hasActiveTranscript(): boolean {
    return Boolean(
      this.pending || this.getActiveUserText().trim() || this.active.ai.trim(),
    );
  }

  /**
   * Freeze the current turn at Gemini's turnComplete boundary. Late final
   * transcription can still amend this pending turn while new interim user
   * speech is collected in a clean active turn.
   */
  beginTurnCompletion(): VoiceTranscriptTurn | undefined {
    if (this.pending) return this.pending;
    const user = this.getActiveUserText().trim();
    const ai = this.active.ai.trim();
    this.active = { userFinal: '', userInterim: '', ai: '' };

    const messages: VoiceTranscriptMessage[] = [];
    if (user) messages.push({ role: 'user', text: user, is_voice: true });
    if (ai) messages.push({ role: 'ai', text: ai, is_voice: true });
    this.pending = { messages };
    return this.pending;
  }

  settlePendingTurn(): VoiceTranscriptTurn | undefined {
    const turn = this.pending;
    this.pending = null;
    if (!turn?.messages.length) return undefined;
    this.completed.push(turn);
    this.sessionTurns.push(turn);
    return turn;
  }

  /**
   * Finalise the current turn and push it to the completed + session lists.
   * Empty turns (nothing from either side) are silently dropped.
   */
  completeTurn(): VoiceTranscriptTurn | undefined {
    this.settlePendingTurn();
    const user = this.getActiveUserText().trim();
    const ai = this.active.ai.trim();
    this.active = { userFinal: '', userInterim: '', ai: '' };

    const messages: VoiceTranscriptMessage[] = [];
    if (user) messages.push({ role: 'user', text: user, is_voice: true });
    if (ai) messages.push({ role: 'ai', text: ai, is_voice: true });
    if (!messages.length) return undefined;

    const turn = { messages };
    this.completed.push(turn);
    this.sessionTurns.push(turn);
    return turn;
  }

  /**
   * On interruption, promote current interim user text. Keep the model words
   * already transcribed because the user may have heard that partial response.
   */
  handleInterruption(): void {
    this.settlePendingTurn();
    const interimText = this.active.userInterim.trim();
    if (interimText) {
      this.active.userFinal = mergeVoiceTranscript(this.active.userFinal, interimText);
      this.active.userInterim = '';
    }
  }

  hasTurns(): boolean {
    return this.completed.length > 0;
  }

  hasSessionTurns(): boolean {
    return this.sessionTurns.length > 0;
  }

  getSessionTurns(): VoiceTranscriptTurn[] {
    const turns = this.pending ? [...this.sessionTurns, this.pending] : this.sessionTurns;
    return turns.map((turn) => ({
      messages: turn.messages.map((message) => ({ ...message })),
    }));
  }

  restoreFailedTurn(turn: VoiceTranscriptTurn): void {
    this.completed.unshift(turn);
  }

  drainCompleted(): VoiceTranscriptTurn[] {
    const completed = this.completed;
    this.completed = [];
    return completed;
  }
}
