/**
 * Times a voice call from the user's tap to the first audible word, and each
 * reply from the end of the user's speech to Memento's first audio.
 *
 * Gemini Live does not tell the client when it decided the user stopped
 * talking, so the end of speech is the last microphone frame sent with speech
 * energy. That estimate is off in both directions: room noise above the
 * threshold moves it later (replies look faster than they are), and a quiet
 * last word below it moves it earlier (replies look slower). The last input
 * transcript gives a second, threshold-free reference, which always arrives
 * after the user stopped. Treat both as estimates; only labelled recordings
 * give the true time.
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
 * A reply interrupted within this long of being heard is an early
 * interruption. That is a proxy for Memento answering before the user was
 * done, not proof of it: a quick correction or "stop" counts too. Compare
 * across experiment arms and audio routes, not as an absolute rate. Spoken
 * interruptions are only possible on headphones or with speaker full duplex;
 * on the gated loudspeaker the user can only tap.
 */
export const VOICE_EARLY_INTERRUPTION_WINDOW_MS = 2_000;

export type VoiceInterruptionSource = 'speech' | 'tap';

/** RMS of a mic frame that always counts as speech. */
export const VOICE_SPEECH_RMS = 0.02;
/**
 * Quieter frames count as speech when they stand this far above the call's
 * own background noise, so quiet speakers' turns are measured too.
 */
export const VOICE_SPEECH_OVER_NOISE = 3;
/** Never treat frames below this as speech, however quiet the room. */
export const VOICE_SPEECH_MIN_RMS = 0.006;

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
  /** First sample played. */
  audibleAt?: number;
  /** End of user speech to the first sample played. */
  audibleMs?: number;
  /** Last input transcript to the first model audio received. */
  transcriptToAudioMs?: number;
  /** A tool call ran between the user's speech and the reply. */
  toolCall: boolean;
  /** How the user interrupted this reply, if they did. */
  interruptedBy?: VoiceInterruptionSource;
  /** Interrupted within VOICE_EARLY_INTERRUPTION_WINDOW_MS of being heard. */
  earlyInterruption: boolean;
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
  turnStats: {
    response: VoiceLatencyStats;
    audible: VoiceLatencyStats;
    earlyInterruptions: number;
    /** Replies interrupted by voice, and by the Interrupt button. */
    interruptions: Record<VoiceInterruptionSource, number>;
    /**
     * Replies to speech Gemini transcribed but the mic never measured as
     * speech: counted as replies, left out of the timing.
     */
    unmeasured: number;
  };
};

export class VoiceLatencyTracker {
  private readonly startedAt: number;
  private readonly milestones = new Map<VoiceMilestone, number>();
  private readonly turns: VoiceTurnLatency[] = [];
  private lastSpeechAt?: number;
  /** Background mic level of this call, tracked from its quiet frames. */
  // Starts high: until quiet frames pull it down, only clear speech counts.
  private noiseFloor = VOICE_SPEECH_RMS / VOICE_SPEECH_OVER_NOISE;
  private unmeasuredReplies = 0;
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
    // Falls quickly to quiet frames, creeps up slowly, so speech barely moves it.
    this.noiseFloor = rms < this.noiseFloor
      ? this.noiseFloor * 0.8 + rms * 0.2
      : this.noiseFloor * 0.99 + rms * 0.01;
    const threshold = Math.min(
      VOICE_SPEECH_RMS,
      Math.max(VOICE_SPEECH_MIN_RMS, this.noiseFloor * VOICE_SPEECH_OVER_NOISE),
    );
    if (rms >= threshold) this.lastSpeechAt = this.now();
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
        earlyInterruption: false,
      };
      if (this.turns.length < MAX_TURNS) this.turns.push(turn);
      this.awaitingPlayback = turn;
      this.currentReply = turn;
    } else if (this.lastTranscriptAt !== undefined && this.lastTranscriptAt > turnEnd) {
      this.unmeasuredReplies += 1;
    }
    this.toolCallSinceTurnEnd = false;
  }

  observePlaybackStart(): void {
    this.mark('firstPlayback');
    const turn = this.awaitingPlayback;
    if (!turn) return;
    turn.audibleAt = this.now();
    turn.audibleMs = turn.audibleAt - turn.speechEndAt;
    this.awaitingPlayback = undefined;
  }

  /** Call on turn-complete, and with `interruptedBy` when the user interrupted. */
  observeModelTurnEnd(options: { interruptedBy?: VoiceInterruptionSource } = {}): void {
    const at = this.now();
    const reply = this.currentReply;
    if (options.interruptedBy && reply) {
      reply.interruptedBy = options.interruptedBy;
      // From when it was heard: received audio may still be buffering.
      const heardAt = reply.audibleAt ?? reply.firstAudioAt;
      reply.earlyInterruption = at - heardAt <= VOICE_EARLY_INTERRUPTION_WINDOW_MS;
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
        earlyInterruptions: this.turns.filter((turn) => turn.earlyInterruption).length,
        interruptions: {
          speech: this.turns.filter((turn) => turn.interruptedBy === 'speech').length,
          tap: this.turns.filter((turn) => turn.interruptedBy === 'tap').length,
        },
        unmeasured: this.unmeasuredReplies,
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
