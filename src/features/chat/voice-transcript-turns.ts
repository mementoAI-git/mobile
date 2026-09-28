export type VoiceTranscriptMessage = {
  role: 'user' | 'ai';
  text: string;
  is_voice: true;
};

export type VoiceTranscriptTurn = {
  messages: VoiceTranscriptMessage[];
};

export class VoiceTranscriptTurns {
  private active = { user: '', ai: '' };
  private completed: VoiceTranscriptTurn[] = [];

  appendUser(fragment: string): string {
    this.active.user += fragment;
    return this.active.user;
  }

  appendModel(fragment: string): string {
    this.active.ai += fragment;
    return this.active.ai;
  }

  completeTurn(): VoiceTranscriptTurn | undefined {
    const user = this.active.user.trim();
    const ai = this.active.ai.trim();
    this.active = { user: '', ai: '' };

    const messages: VoiceTranscriptMessage[] = [];
    if (user) messages.push({ role: 'user', text: user, is_voice: true });
    if (ai) messages.push({ role: 'ai', text: ai, is_voice: true });
    if (!messages.length) return undefined;

    const turn = { messages };
    this.completed.push(turn);
    return turn;
  }

  hasTurns(): boolean {
    return this.completed.length > 0;
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
