/**
 * Times a voice call from the user's tap to the first audible word, and each
 * reply from the end of the user's speech to Memento's first audio.
 *
 * Gemini Live does not tell the client when it decided the user stopped
 * talking, so the end of speech is the last microphone frame sent with speech
 * energy. Room noise above the threshold makes replies look slightly faster
 * than they are, never slower. The last input transcript gives a second,
 * threshold-free reference that always arrives after the user stopped.
 */

/**
 * Startup milestones, in the order a call reaches them. Audio start runs in
 * parallel with the token and connection, so it is timed separately.
 */
export const VOICE_MILESTONES = [
  'permission',
  'token',
  'sdk',
  'socketOpen',
  'setupComplete',
  'greetingSent',
  'firstAudio',
  'firstPlayback',
] as const;

export type VoiceMilestone = (typeof VOICE_MILESTONES)[number];

/**
 * A reply the user interrupts within this long of its first audio counts as
 * Memento cutting them off: it decided they were done while they were not.
 * Only measurable when the user can barge in, i.e. on headphones or with
 * speaker full duplex; on the loudspeaker the mic is gated while Memento talks.
 */
export const VOICE_CUTOFF_WINDOW_MS = 2_000;

/** RMS of a mic frame that counts as speech rather than room noise. */
export const VOICE_SPEECH_RMS = 0.02;

const MAX_TURNS = 100;

export type VoiceStartupStage = {
  name: VoiceMilestone;
  startAt: number;
  endAt: number;
  durationMs: number;
};

export type VoiceInterval = { startAt: number; endAt: number; durationMs: number };

export type VoiceTurnLatency = {
  speechEndAt: number;
  firstAudioAt: number;
  /** End of user speech to the first model audio received. */
  responseMs: number;
  /** End of user speech to the first sample played. */
  audibleMs?: number;
  /** Last input transcript to the first model audio received. */
  transcriptToAudioMs?: number;
  /** A tool call ran between the user's speech and the reply. */
  toolCall: boolean;
  /** The user interrupted this reply within VOICE_CUTOFF_WINDOW_MS. */
  cutOff: boolean;
};

export type VoiceLatencyStats = {
  count: number;
  p50Ms?: number;
  p90Ms?: number;
  maxMs?: number;
};

export type VoiceLatencySummary = {
  startedAt: number;
  stages: VoiceStartupStage[];
  /** Audio session, player and microphone start, alongside the stages. */
  audioStart?: VoiceInterval;
  /** Tap to the first audible sample of the greeting. */
  timeToFirstWordMs?: number;
  turns: VoiceTurnLatency[];
  turnStats: { response: VoiceLatencyStats; audible: VoiceLatencyStats; cutOffs: number };
};

export class VoiceLatencyTracker {
  private readonly startedAt: number;
  private readonly milestones = new Map<VoiceMilestone, number>();
  private readonly turns: VoiceTurnLatency[] = [];
  private lastSpeechAt?: number;
  private lastTranscriptAt?: number;
  private lastModelTurnEndAt?: number;
  private modelTurnOpen = false;
  private toolCallSinceTurnEnd = false;
  private awaitingPlayback?: VoiceTurnLatency;
  private currentReply?: VoiceTurnLatency;
  private audioStartBeganAt?: number;
  private audioStartEndedAt?: number;

  constructor(private readonly now: () => number = Date.now) {
    this.startedAt = now();
  }

  /** Records a milestone once. Later calls, for example on reconnect, are ignored. */
  mark(milestone: VoiceMilestone): void {
    if (!this.milestones.has(milestone)) this.milestones.set(milestone, this.now());
  }

  beginAudioStart(): void {
    this.audioStartBeganAt ??= this.now();
  }

  endAudioStart(): void {
    if (this.audioStartBeganAt !== undefined) this.audioStartEndedAt ??= this.now();
  }

  /** Call for every mic frame actually sent to Gemini. */
  observeMicFrame(rms: number): void {
    if (rms >= VOICE_SPEECH_RMS) this.lastSpeechAt = this.now();
  }

  observeUserTranscript(): void {
    this.lastTranscriptAt = this.now();
  }

  observeToolCall(): void {
    this.toolCallSinceTurnEnd = true;
  }

  observeModelAudio(): void {
    this.mark('firstAudio');
    if (this.modelTurnOpen) return;
    this.modelTurnOpen = true;

    const at = this.now();
    const turnEnd = this.lastModelTurnEndAt ?? Number.NEGATIVE_INFINITY;
    if (this.lastSpeechAt !== undefined && this.lastSpeechAt > turnEnd) {
      const turn: VoiceTurnLatency = {
        speechEndAt: this.lastSpeechAt,
        firstAudioAt: at,
        responseMs: at - this.lastSpeechAt,
        transcriptToAudioMs:
          this.lastTranscriptAt !== undefined && this.lastTranscriptAt > turnEnd
            ? at - this.lastTranscriptAt
            : undefined,
        toolCall: this.toolCallSinceTurnEnd,
        cutOff: false,
      };
      if (this.turns.length < MAX_TURNS) this.turns.push(turn);
      this.awaitingPlayback = turn;
      this.currentReply = turn;
    }
    this.toolCallSinceTurnEnd = false;
  }

  observePlaybackStart(): void {
    this.mark('firstPlayback');
    const turn = this.awaitingPlayback;
    if (!turn) return;
    turn.audibleMs = this.now() - turn.speechEndAt;
    this.awaitingPlayback = undefined;
  }

  /** Call on turn-complete, and with `interrupted` when the user barged in. */
  observeModelTurnEnd(options: { interrupted?: boolean } = {}): void {
    const at = this.now();
    const reply = this.currentReply;
    if (options.interrupted && reply && at - reply.firstAudioAt <= VOICE_CUTOFF_WINDOW_MS) {
      reply.cutOff = true;
    }
    this.currentReply = undefined;
    this.modelTurnOpen = false;
    this.lastModelTurnEndAt = at;
  }

  summary(): VoiceLatencySummary {
    const stages: VoiceStartupStage[] = [];
    let previous = this.startedAt;
    for (const name of VOICE_MILESTONES) {
      const at = this.milestones.get(name);
      if (at === undefined) continue;
      stages.push({ name, startAt: previous, endAt: at, durationMs: at - previous });
      previous = at;
    }

    const firstPlayback = this.milestones.get('firstPlayback');
    const audioStart =
      this.audioStartBeganAt !== undefined && this.audioStartEndedAt !== undefined
        ? {
            startAt: this.audioStartBeganAt,
            endAt: this.audioStartEndedAt,
            durationMs: this.audioStartEndedAt - this.audioStartBeganAt,
          }
        : undefined;
    return {
      startedAt: this.startedAt,
      stages,
      audioStart,
      timeToFirstWordMs:
        firstPlayback === undefined ? undefined : firstPlayback - this.startedAt,
      turns: this.turns.map((turn) => ({ ...turn })),
      turnStats: {
        response: latencyStats(this.turns.map((turn) => turn.responseMs)),
        audible: latencyStats(
          this.turns
            .map((turn) => turn.audibleMs)
            .filter((value): value is number => value !== undefined),
        ),
        cutOffs: this.turns.filter((turn) => turn.cutOff).length,
      },
    };
  }
}

function latencyStats(values: number[]): VoiceLatencyStats {
  if (values.length === 0) return { count: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (percentile: number) =>
    sorted[Math.max(0, Math.ceil(percentile * sorted.length) - 1)];
  return {
    count: sorted.length,
    p50Ms: rank(0.5),
    p90Ms: rank(0.9),
    maxMs: sorted[sorted.length - 1],
  };
}
