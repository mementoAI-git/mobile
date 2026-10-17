import type { LiveServerMessage } from '@google/genai/web';

import type { VoiceToolCall } from './voice-tool-relay';

export type VoiceMessageEffect =
  | { type: 'setup-complete' }
  | { type: 'output-audio'; data: string; epoch: number }
  | { type: 'input-transcript'; text: string; isInterim: boolean }
  | { type: 'output-transcript'; text: string; finished: boolean }
  | { type: 'interrupted' }
  | { type: 'turn-complete' }
  | { type: 'resumption-handle'; handle: string }
  | { type: 'go-away'; timeLeftMs: number }
  | { type: 'tool-call'; calls: VoiceToolCall[] }
  | { type: 'tool-call-cancellation'; ids: string[] }
  | { type: 'usage'; promptTokens?: number; responseTokens?: number; totalTokens?: number };

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

/** Gemini sends durations as protobuf strings such as "5s" or "0.5s". */
function durationToMs(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value * 1_000;
  if (typeof value !== 'string') return 0;
  const seconds = Number.parseFloat(value);
  return Number.isFinite(seconds) ? seconds * 1_000 : 0;
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

    const resumption =
      message.sessionResumptionUpdate ?? message.session_resumption_update;
    const newHandle = resumption?.newHandle ?? resumption?.new_handle;
    if (resumption?.resumable && typeof newHandle === 'string' && newHandle) {
      effects.push({ type: 'resumption-handle', handle: newHandle });
    }

    const goAway = message.goAway ?? message.go_away;
    if (goAway && typeof goAway === 'object') {
      effects.push({
        type: 'go-away',
        timeLeftMs: durationToMs(goAway.timeLeft ?? goAway.time_left),
      });
    }

    const toolCall = message.toolCall ?? message.tool_call;
    const functionCalls = toolCall?.functionCalls ?? toolCall?.function_calls;
    if (Array.isArray(functionCalls) && functionCalls.length) {
      effects.push({
        type: 'tool-call',
        calls: functionCalls
          .filter((call: any) => call && typeof call.name === 'string')
          .map((call: any) => ({
            id: typeof call.id === 'string' ? call.id : undefined,
            name: call.name,
            args: call.args && typeof call.args === 'object' ? call.args : {},
          })),
      });
    }

    const cancellation = message.toolCallCancellation ?? message.tool_call_cancellation;
    if (Array.isArray(cancellation?.ids) && cancellation.ids.length) {
      effects.push({
        type: 'tool-call-cancellation',
        ids: cancellation.ids.filter((id: unknown): id is string => typeof id === 'string'),
      });
    }

    const usage = message.usageMetadata ?? message.usage_metadata;
    if (usage && typeof usage === 'object') {
      const count = (camel: string, snake: string) => {
        const value = (usage as Record<string, unknown>)[camel] ?? (usage as Record<string, unknown>)[snake];
        return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
      };
      effects.push({
        type: 'usage',
        promptTokens: count('promptTokenCount', 'prompt_token_count'),
        responseTokens: count('responseTokenCount', 'response_token_count'),
        totalTokens: count('totalTokenCount', 'total_token_count'),
      });
    }

    const content = message.serverContent ?? message.server_content;
    if (!content || typeof content !== 'object') return effects;

    if (content.interrupted) {
      effects.push({ type: 'interrupted' });
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

    // Input must reach the interruption guard before new audio makes it judge
    // the interruption. Keep the new output transcript after that judgement so
    // words in this answer are not mistaken for echo of the previous answer.
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
