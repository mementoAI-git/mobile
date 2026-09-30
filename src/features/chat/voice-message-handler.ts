import type { LiveServerMessage } from '@google/genai/web';

export type VoiceMessageEffect =
  | { type: 'setup-complete' }
  | { type: 'output-audio'; data: string; epoch: number }
  | { type: 'input-transcript'; text: string; isInterim: boolean }
  | { type: 'output-transcript'; text: string; finished: boolean }
  | { type: 'interrupted' }
  | { type: 'turn-complete' };

export type VoiceServerMessageSummary = {
  setupComplete: boolean;
  serverContentKeys: string[];
  interrupted: boolean;
  turnComplete: boolean;
  outputAudioFrames: number;
  inputTranscriptLength: number;
  interimInputTranscriptLength: number;
  outputTranscriptLength: number;
  outputTranscriptFinished: boolean;
};

type VoiceServerMessage = Partial<LiveServerMessage> & Record<string, any>;

function transcriptLength(value: unknown): number {
  if (!value || typeof value !== 'object') return 0;
  const text = (value as Record<string, unknown>).text;
  return typeof text === 'string' ? text.length : 0;
}

/**
 * Returns privacy-safe metadata for diagnosing Gemini Live event delivery.
 * Transcript content and audio payloads are intentionally never included.
 */
export function summarizeVoiceServerMessage(
  message: VoiceServerMessage,
): VoiceServerMessageSummary {
  const content = message?.serverContent ?? message?.server_content;
  const safeContent = content && typeof content === 'object'
    ? content as Record<string, any>
    : {};
  const modelTurn = safeContent.modelTurn ?? safeContent.model_turn;
  const parts = Array.isArray(modelTurn?.parts) ? modelTurn.parts : [];
  const outputTranscription =
    safeContent.outputTranscription ?? safeContent.output_transcription;

  return {
    setupComplete: Boolean(message?.setupComplete ?? message?.setup_complete),
    serverContentKeys: Object.keys(safeContent).sort(),
    interrupted: safeContent.interrupted === true,
    turnComplete: Boolean(safeContent.turnComplete ?? safeContent.turn_complete),
    outputAudioFrames: parts.filter((rawPart: unknown) => {
      if (!rawPart || typeof rawPart !== 'object') return false;
      const part = rawPart as Record<string, any>;
      return typeof (part.inlineData?.data ?? part.inline_data?.data) === 'string';
    }).length,
    inputTranscriptLength: transcriptLength(
      safeContent.inputTranscription ?? safeContent.input_transcription,
    ),
    interimInputTranscriptLength: transcriptLength(
      safeContent.interimInputTranscription ??
        safeContent.interim_input_transcription,
    ),
    outputTranscriptLength: transcriptLength(outputTranscription),
    outputTranscriptFinished: outputTranscription?.finished === true,
  };
}

export class VoiceMessageHandler {
  handle(message: VoiceServerMessage, currentEpoch: number): VoiceMessageEffect[] {
    const effects: VoiceMessageEffect[] = [];
    if (!message || typeof message !== 'object') return effects;

    if (message.setupComplete || message.setup_complete) {
      effects.push({ type: 'setup-complete' });
    }

    const content = message.serverContent ?? message.server_content;
    if (!content || typeof content !== 'object') return effects;

    if (content.interrupted) {
      effects.push({ type: 'interrupted' });
    }

    const modelTurn = content.modelTurn ?? content.model_turn;
    for (const rawPart of modelTurn?.parts ?? []) {
      const part = rawPart as Record<string, any>;
      const data = part.inlineData?.data ?? part.inline_data?.data;
      if (typeof data === 'string' && data.length > 0) {
        effects.push({ type: 'output-audio', data, epoch: currentEpoch });
      }
      // ⚠️  DO NOT capture part.text as a spoken transcript.
      // In Gemini 2.5 native-audio models with thinking enabled, modelTurn.parts[]
      // contains the model's chain-of-thought reasoning text, NOT what it actually
      // spoke. The real spoken transcript is always in content.outputTranscription.
      // Capturing part.text would show the model's internal reasoning to the user.
    }

    // ── Input transcription ──────────────────────────────────────────────────
    // inputTranscription: final, complete utterance delivered as one string.
    // interimInputTranscription: live partial updated on each VAD frame.
    const inputTranscription =
      content.inputTranscription ?? content.input_transcription;
    const interimInputTranscription =
      content.interimInputTranscription ?? content.interim_input_transcription;
    const finalInputText = inputTranscription?.text;
    const interimInputText = interimInputTranscription?.text;

    if (typeof finalInputText === 'string' && finalInputText.length > 0) {
      effects.push({ type: 'input-transcript', text: finalInputText, isInterim: false });
    } else if (typeof interimInputText === 'string' && interimInputText.length > 0) {
      effects.push({ type: 'input-transcript', text: interimInputText, isInterim: true });
    }

    // ── Output transcription ─────────────────────────────────────────────────
    // outputTranscription is the ONLY reliable source for what Memento spoke.
    // It streams word-by-word. Transcription.finished marks the last fragment.
    // This field is independent of modelTurn — it may arrive in a separate
    // WebSocket frame before OR after turnComplete.
    const outputTranscription =
      content.outputTranscription ?? content.output_transcription;
    const outputText = outputTranscription?.text;
    const outputFinished = outputTranscription?.finished === true;

    if (typeof outputText === 'string' && outputText.length > 0) {
      effects.push({ type: 'output-transcript', text: outputText, finished: outputFinished });
    } else if (outputFinished) {
      // Finished flag with empty text = final frame signal (no trailing word).
      effects.push({ type: 'output-transcript', text: '', finished: true });
    }

    if (content.turnComplete || content.turn_complete) {
      effects.push({ type: 'turn-complete' });
    }

    return effects;
  }
}
